import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { pool } from '../../db/index';

const execAsync = promisify(exec);
const router = Router();

/**
 * Comprehensive health check endpoint for production monitoring
 */
router.get('/health', async (req, res) => {
  try {
    const healthData: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version,
      platform: os.platform(),
      arch: os.arch(),
      memory: {
        total: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
        free: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
        used: `${((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2)} GB`,
        process_used: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        load_avg: os.loadavg(),
      },
    };

    // Check GPU availability (if running on GPU server)
    try {
      if (process.env.CUDA_VISIBLE_DEVICES !== undefined) {
        const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu --format=csv,noheader,nounits');
        const gpuData = stdout.trim().split(',').map(s => s.trim());
        
        healthData.gpu = {
          available: true,
          device: gpuData[0] || 'Unknown',
          memory_total: `${gpuData[1]} MB`,
          memory_used: `${gpuData[2]} MB`,
          memory_free: `${gpuData[3]} MB`,
          utilization: `${gpuData[4]}%`,
        };
      } else {
        healthData.gpu = {
          available: false,
          message: 'Running on CPU',
        };
      }
    } catch (error) {
      healthData.gpu = {
        available: false,
        message: 'GPU status unavailable',
      };
    }

    // Check database connection
    try {
      if (process.env.DATABASE_URL) {
        // postgres-js uses sql`...` template tag syntax
        await pool`SELECT 1`;
        healthData.database = {
          status: 'connected',
          type: 'PostgreSQL',
        };
      } else {
        healthData.database = {
          status: 'not_configured',
          message: 'DATABASE_URL not set',
        };
        healthData.status = 'degraded';
      }
    } catch (error: any) {
      healthData.database = {
        status: 'disconnected',
        error: error.message,
      };
      healthData.status = 'degraded';
    }

    // Check ML worker pool and client initialization
    try {
      const mlClientInitialized = (global as any).mlClientInitialized;
      const workerPool = (global as any).mlWorkerPool;
      
      healthData.ml_workers = {
        initialized: mlClientInitialized || false,
        status: mlClientInitialized ? 'available' : 'initializing',
      };
      
      if (workerPool) {
        const workers = workerPool.getWorkers();
        healthData.ml_workers = {
          ...healthData.ml_workers,
          total: workers.length,
          active: workers.filter((w: any) => w.busy).length,
          idle: workers.filter((w: any) => !w.busy).length,
        };
      }
      
      // If not initialized, mark status as degraded
      if (!mlClientInitialized) {
        healthData.status = 'degraded';
        healthData.ml_workers.message = 'ML services are still initializing. TTS/STT/VAD endpoints may return 503.';
      }
    } catch (error) {
      healthData.ml_workers = {
        status: 'unavailable',
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      healthData.status = 'degraded';
    }

    // Check feature availability
    healthData.features = {
      telephony: process.env.ENABLE_TELEPHONY === 'true',
      voice_cloning: process.env.ENABLE_VOICE_CLONING === 'true',
      vllm: process.env.ENABLE_VLLM === 'true',
      websocket_gateway: process.env.ENABLE_WEBSOCKET_GATEWAY === 'true',
    };

    res.json(healthData);
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Readiness probe - checks if app is ready to serve traffic
 */
router.get('/ready', async (req, res) => {
  try {
    if (process.env.DATABASE_URL) {
      await pool`SELECT 1`;
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Liveness probe - checks if app is alive
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export default router;
