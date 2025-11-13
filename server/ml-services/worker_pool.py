#!/usr/bin/env python3
"""
Worker Pool Manager for ML Services

Manages a pool of persistent Python workers for STT, TTS, and VLLM processing.
Uses multiprocessing.Queue for task distribution and maintains warm workers
to avoid cold start latency.

Architecture:
- Workers run in separate processes, each with loaded models
- JSON-based IPC via stdin/stdout
- Task queue with priority support
- Health checks and automatic worker restart
- Target: <50ms task submission latency

Usage:
    # Start worker pool
    python worker_pool.py --workers 4 --worker-type stt

    # Workers listen on stdin for tasks
    # Tasks format: {"task_id": "uuid", "type": "stt", "data": {...}}
"""

import sys
import json
import time
import signal
import multiprocessing as mp
from multiprocessing import Process, Queue, Event
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import traceback
from datetime import datetime
import queue


class WorkerType(Enum):
    STT = "stt"
    TTS = "tts"
    VLLM = "vllm"
    HF_TTS = "hf_tts"
    CLONE = "clone"


@dataclass
class Task:
    """Task to be processed by a worker"""
    task_id: str
    worker_type: WorkerType
    data: Dict[str, Any]
    priority: int = 0
    submitted_at: float = 0.0


@dataclass
class WorkerStats:
    """Statistics for a worker"""
    worker_id: int
    tasks_processed: int
    errors: int
    avg_processing_time: float
    last_task_at: float
    status: str  # "idle", "busy", "error", "starting"


class Worker:
    """Individual worker process"""
    
    def __init__(self, worker_id: int, worker_type: WorkerType, task_queue: Any, result_queue: Any, shutdown_event: Any):
        self.worker_id = worker_id
        self.worker_type = worker_type
        self.task_queue = task_queue
        self.result_queue = result_queue
        self.shutdown_event = shutdown_event
        self.process: Optional[Process] = None
        self.stats = WorkerStats(
            worker_id=worker_id,
            tasks_processed=0,
            errors=0,
            avg_processing_time=0.0,
            last_task_at=0.0,
            status="starting"
        )
    
    def start(self):
        """Start the worker process"""
        self.process = Process(target=self._run, name=f"Worker-{self.worker_id}")
        self.process.start()
        self.stats.status = "idle"
    
    def _run(self):
        """Main worker loop"""
        # Import the appropriate service based on worker type
        service = None
        try:
            if self.worker_type == WorkerType.STT:
                from stt_service import STTService
                service = STTService()
                print(f"[Worker {self.worker_id}] STT service initialized", file=sys.stderr, flush=True)
            elif self.worker_type == WorkerType.TTS:
                from tts_streaming import StreamingTTSService
                service = StreamingTTSService()
                print(f"[Worker {self.worker_id}] TTS streaming service initialized", file=sys.stderr, flush=True)
            elif self.worker_type == WorkerType.HF_TTS:
                from hf_tts_service import HFTTSService
                service = HFTTSService()
                print(f"[Worker {self.worker_id}] HF TTS service initialized", file=sys.stderr, flush=True)
            elif self.worker_type == WorkerType.VLLM:
                from vllm_service import VLLMAgentService
                service = VLLMAgentService()
                print(f"[Worker {self.worker_id}] VLLM agent service initialized", file=sys.stderr, flush=True)
            elif self.worker_type == WorkerType.CLONE:
                from voice_cloning_service import VoiceCloningService
                service = VoiceCloningService()
                print(f"[Worker {self.worker_id}] Voice cloning service initialized", file=sys.stderr, flush=True)
        except Exception as e:
            print(f"[Worker {self.worker_id}] Failed to initialize service: {e}", file=sys.stderr, flush=True)
            traceback.print_exc(file=sys.stderr)
            return
        
        # Process tasks until shutdown
        while not self.shutdown_event.is_set():
            try:
                # Get task with timeout to check shutdown periodically
                try:
                    task_data = self.task_queue.get(timeout=0.5)
                except queue.Empty:
                    continue
                
                task = Task(**task_data)
                start_time = time.time()
                
                # Process task based on type
                try:
                    result = self._process_task(service, task)
                    processing_time = time.time() - start_time
                    
                    # Send result
                    self.result_queue.put({
                        "task_id": task.task_id,
                        "status": "success",
                        "result": result,
                        "worker_id": self.worker_id,
                        "processing_time": processing_time
                    })
                    
                except Exception as e:
                    processing_time = time.time() - start_time
                    self.result_queue.put({
                        "task_id": task.task_id,
                        "status": "error",
                        "error": str(e),
                        "worker_id": self.worker_id,
                        "processing_time": processing_time
                    })
                    print(f"[Worker {self.worker_id}] Task error: {e}", file=sys.stderr, flush=True)
                
            except Exception as e:
                print(f"[Worker {self.worker_id}] Unexpected error: {e}", file=sys.stderr, flush=True)
                traceback.print_exc(file=sys.stderr)
    
    def _process_task(self, service, task: Task) -> Dict[str, Any]:
        """Process a task using the loaded service"""
        if self.worker_type == WorkerType.STT:
            # STT task processing - use transcribe method for real STT
            import base64
            audio_b64 = task.data.get("audio", "")
            language = task.data.get("language", "en")
            
            if not audio_b64:
                return {"error": "No audio provided"}
            
            audio_bytes = base64.b64decode(audio_b64)
            result = service.transcribe(audio_bytes, language)
            return result
        elif self.worker_type == WorkerType.TTS:
            # TTS task processing
            audio_bytes = service.synthesize(
                text=task.data.get("text", ""),
                model=task.data.get("model", "chatterbox"),
                voice=task.data.get("voice"),
                speed=task.data.get("speed", 1.0)
            )
            import base64
            return {
                "audio": base64.b64encode(audio_bytes).decode('utf-8')
            }
        elif self.worker_type == WorkerType.HF_TTS:
            # HF TTS task processing
            audio_bytes = service.synthesize(
                text=task.data.get("text", ""),
                model=task.data.get("model", "parler_tts_multilingual"),
                voice_prompt=task.data.get("voice_prompt", "A clear and natural voice")
            )
            import base64
            return {
                "audio": base64.b64encode(audio_bytes).decode('utf-8'),
                "format": "wav",
                "sample_rate": 44100
            }
        elif self.worker_type == WorkerType.VLLM:
            # VLLM agent task processing
            return service.generate_response(task.data)
        elif self.worker_type == WorkerType.CLONE:
            # Voice cloning task processing
            action = task.data.get("action")
            
            if action == "create_instant":
                clone_id = task.data["clone_id"]
                audio_b64 = task.data["audio"]
                name = task.data.get("name", "Untitled")
                
                import base64
                audio_bytes = base64.b64decode(audio_b64)
                result = service.create_instant_clone(clone_id, audio_bytes, name)
                
                # Convert dataclasses to dicts for JSON serialization
                from dataclasses import asdict
                return {
                    "clone_id": result.clone_id,
                    "mode": result.mode,
                    "status": result.status,
                    "characteristics": asdict(result.characteristics) if result.characteristics else None,
                    "embedding": {
                        "confidence": result.embedding.confidence,
                        "sample_duration": result.embedding.sample_duration,
                        "snr_db": result.embedding.snr_db
                    } if result.embedding else None,
                    "training_progress": result.training_progress,
                    "quality_score": result.quality_score,
                    "message": result.message
                }
            
            elif action == "create_professional":
                clone_id = task.data["clone_id"]
                audio_b64 = task.data["audio"]
                name = task.data.get("name", "Untitled")
                
                import base64
                audio_bytes = base64.b64decode(audio_b64)
                result = service.create_professional_clone(clone_id, audio_bytes, name)
                
                from dataclasses import asdict
                return {
                    "clone_id": result.clone_id,
                    "mode": result.mode,
                    "status": result.status,
                    "characteristics": asdict(result.characteristics) if result.characteristics else None,
                    "embedding": {
                        "confidence": result.embedding.confidence,
                        "sample_duration": result.embedding.sample_duration,
                        "snr_db": result.embedding.snr_db
                    } if result.embedding else None,
                    "training_progress": result.training_progress,
                    "quality_score": result.quality_score,
                    "message": result.message
                }
            
            elif action == "create_synthetic":
                clone_id = task.data["clone_id"]
                description = task.data.get("description", "")
                characteristics = task.data.get("characteristics", {})
                
                result = service.create_synthetic_clone(clone_id, description, characteristics)
                
                from dataclasses import asdict
                return {
                    "clone_id": result.clone_id,
                    "mode": result.mode,
                    "status": result.status,
                    "characteristics": asdict(result.characteristics) if result.characteristics else None,
                    "training_progress": result.training_progress,
                    "quality_score": result.quality_score,
                    "message": result.message
                }
            
            elif action == "get_status":
                clone_id = task.data["clone_id"]
                result = service.get_clone_status(clone_id)
                
                if result:
                    return {
                        "clone_id": result.clone_id,
                        "mode": result.mode,
                        "status": result.status,
                        "training_progress": result.training_progress,
                        "quality_score": result.quality_score,
                        "message": result.message
                    }
                else:
                    raise ValueError(f"Clone not found: {clone_id}")
            
            else:
                raise ValueError(f"Unknown voice cloning action: {action}")
        else:
            raise ValueError(f"Unknown worker type: {self.worker_type}")
    
    def is_alive(self) -> bool:
        """Check if worker process is alive"""
        return self.process is not None and self.process.is_alive()
    
    def terminate(self):
        """Terminate the worker process"""
        if self.process and self.process.is_alive():
            self.process.terminate()
            self.process.join(timeout=5)
            if self.process.is_alive():
                self.process.kill()


class WorkerPool:
    """
    Worker pool manager
    
    Maintains a pool of persistent workers and distributes tasks among them.
    Handles worker lifecycle, health checks, and graceful shutdown.
    """
    
    def __init__(self, num_workers: int, worker_type: WorkerType):
        self.num_workers = num_workers
        self.worker_type = worker_type
        self.workers: List[Worker] = []
        self.task_queue = Queue(maxsize=1000)
        self.result_queue = Queue()
        self.shutdown_event = Event()
        self.running = False
        
        # Metrics
        self.tasks_submitted = 0
        self.tasks_completed = 0
        self.tasks_failed = 0
        
        # Setup signal handlers
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        signal.signal(signal.SIGINT, self._handle_shutdown)
    
    def start(self):
        """Start the worker pool"""
        print(f"[WorkerPool] Starting {self.num_workers} {self.worker_type.value} workers...", file=sys.stderr, flush=True)
        
        for i in range(self.num_workers):
            worker = Worker(
                worker_id=i,
                worker_type=self.worker_type,
                task_queue=self.task_queue,
                result_queue=self.result_queue,
                shutdown_event=self.shutdown_event
            )
            worker.start()
            self.workers.append(worker)
        
        self.running = True
        print(f"[WorkerPool] All workers started", file=sys.stderr, flush=True)
    
    def submit_task(self, task_id: str, data: Dict[str, Any], priority: int = 0) -> float:
        """
        Submit a task to the worker pool
        
        Returns: Task submission latency in milliseconds
        """
        start_time = time.time()
        
        task_data = {
            "task_id": task_id,
            "worker_type": self.worker_type,
            "data": data,
            "priority": priority,
            "submitted_at": start_time
        }
        
        self.task_queue.put(task_data)
        self.tasks_submitted += 1
        
        submission_latency = (time.time() - start_time) * 1000  # Convert to ms
        return submission_latency
    
    def get_result(self, timeout: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """Get a result from the result queue"""
        try:
            result = self.result_queue.get(timeout=timeout)
            if result["status"] == "success":
                self.tasks_completed += 1
            else:
                self.tasks_failed += 1
            return result
        except queue.Empty:
            return None
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get worker pool metrics"""
        alive_workers = sum(1 for w in self.workers if w.is_alive())
        
        return {
            "worker_type": self.worker_type.value,
            "num_workers": self.num_workers,
            "alive_workers": alive_workers,
            "tasks_submitted": self.tasks_submitted,
            "tasks_completed": self.tasks_completed,
            "tasks_failed": self.tasks_failed,
            "queue_depth": self.task_queue.qsize(),
            "worker_utilization": (self.num_workers - alive_workers) / self.num_workers if self.num_workers > 0 else 0
        }
    
    def health_check(self):
        """Check worker health and restart failed workers"""
        for i, worker in enumerate(self.workers):
            if not worker.is_alive():
                print(f"[WorkerPool] Worker {i} died, restarting...", file=sys.stderr, flush=True)
                worker.terminate()
                new_worker = Worker(
                    worker_id=i,
                    worker_type=self.worker_type,
                    task_queue=self.task_queue,
                    result_queue=self.result_queue,
                    shutdown_event=self.shutdown_event
                )
                new_worker.start()
                self.workers[i] = new_worker
    
    def shutdown(self):
        """Gracefully shutdown the worker pool"""
        if not self.running:
            return
        
        print(f"[WorkerPool] Shutting down...", file=sys.stderr, flush=True)
        self.running = False
        self.shutdown_event.set()
        
        # Wait for workers to finish
        for worker in self.workers:
            worker.terminate()
        
        print(f"[WorkerPool] Shutdown complete", file=sys.stderr, flush=True)
    
    def _handle_shutdown(self, signum, frame):
        """Handle shutdown signals"""
        print(f"\n[WorkerPool] Received signal {signum}, shutting down...", file=sys.stderr, flush=True)
        self.shutdown()
        sys.exit(0)


def main():
    """
    Main entry point for worker pool
    
    Runs as a persistent process, accepting tasks via stdin and returning
    results via stdout in JSON format.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description="ML Worker Pool")
    parser.add_argument("--workers", type=int, default=2, help="Number of workers")
    parser.add_argument("--worker-type", type=str, choices=["stt", "tts", "hf_tts", "vllm", "clone"], default="stt")
    args = parser.parse_args()
    
    worker_type = WorkerType(args.worker_type)
    pool = WorkerPool(num_workers=args.workers, worker_type=worker_type)
    pool.start()
    
    # Send ready signal
    print(json.dumps({
        "type": "ready",
        "worker_type": worker_type.value,
        "num_workers": args.workers
    }), flush=True)
    
    # Main loop: accept tasks from stdin, return results on stdout
    try:
        while pool.running:
            # Check for incoming tasks
            try:
                line = sys.stdin.readline()
                if not line:
                    # EOF reached
                    break
                
                request = json.loads(line)
                request_type = request.get("type")
                
                if request_type == "submit_task":
                    # Submit task to pool
                    task_id = request.get("task_id")
                    data = request.get("data", {})
                    priority = request.get("priority", 0)
                    
                    latency = pool.submit_task(task_id, data, priority)
                    
                    # Send acknowledgment
                    print(json.dumps({
                        "type": "task_submitted",
                        "task_id": task_id,
                        "submission_latency": latency
                    }), flush=True)
                    
                elif request_type == "get_result":
                    # Get result with timeout
                    timeout = request.get("timeout", 1.0)
                    result = pool.get_result(timeout=timeout)
                    
                    if result:
                        print(json.dumps({
                            "type": "task_result",
                            **result
                        }), flush=True)
                    else:
                        print(json.dumps({
                            "type": "no_result",
                            "message": "No result available"
                        }), flush=True)
                
                elif request_type == "get_metrics":
                    # Return metrics
                    metrics = pool.get_metrics()
                    print(json.dumps({
                        "type": "metrics",
                        **metrics
                    }), flush=True)
                
                elif request_type == "health_check":
                    # Perform health check
                    pool.health_check()
                    print(json.dumps({
                        "type": "health_check_complete"
                    }), flush=True)
                
                elif request_type == "shutdown":
                    # Graceful shutdown
                    pool.shutdown()
                    print(json.dumps({
                        "type": "shutdown_complete"
                    }), flush=True)
                    break
                
            except json.JSONDecodeError as e:
                print(json.dumps({
                    "type": "error",
                    "error": f"Invalid JSON: {e}"
                }), flush=True)
            except Exception as e:
                print(json.dumps({
                    "type": "error",
                    "error": str(e)
                }), flush=True)
                traceback.print_exc(file=sys.stderr)
            
            # Periodic health check
            pool.health_check()
    
    finally:
        pool.shutdown()


if __name__ == "__main__":
    main()
