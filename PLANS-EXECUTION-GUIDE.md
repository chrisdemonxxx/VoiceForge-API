# VoiceForge Production Deployment - Multi-Agent Execution Guide

## Overview

Four separate, focused plans have been created for parallel execution across multiple agent sessions. Each plan is self-contained and can be assigned to a different agent.

## Plan Files Created

1. **PLAN-1-BACKEND-API-WIRING.md** - Replace mock STT/VAD/VLLM endpoints
2. **PLAN-2-TELEPHONY-BIDIRECTIONAL.md** - Complete two-way voice conversations
3. **PLAN-3-FRONTEND-INTEGRATION.md** - Remove mocks, verify API calls
4. **PLAN-4-ML-SERVICES-VERIFICATION.md** - Verify HF Spaces, test ML services

## How to Execute with Multiple Agents

### Step 1: Open Multiple Cursor Windows/Sessions

1. **Open 4 separate Cursor windows** (or use 4 different agent sessions)
2. **Each window should have the same project open**
3. **Each window will work on a different plan**

### Step 2: Assign Plans to Agents

**Agent Session 1** → Plan 1 (Backend API Wiring)
- Open: `PLAN-1-BACKEND-API-WIRING.md`
- Focus: `server/routes.ts` (STT, VAD, VLLM endpoints)
- Estimated time: 3-4 hours

**Agent Session 2** → Plan 2 (Telephony Bidirectional)
- Open: `PLAN-2-TELEPHONY-BIDIRECTIONAL.md`
- Focus: `server/routes.ts` (Twilio stream), `server/services/telephony-service.ts`
- Estimated time: 4-5 hours
- **Note**: Should wait for Plan 1 to complete

**Agent Session 3** → Plan 3 (Frontend Integration)
- Open: `PLAN-3-FRONTEND-INTEGRATION.md`
- Focus: `client/src/pages/*.tsx` files
- Estimated time: 2-3 hours
- **Note**: Should wait for Plan 1 to complete

**Agent Session 4** → Plan 4 (ML Services Verification)
- Open: `PLAN-4-ML-SERVICES-VERIFICATION.md`
- Focus: Testing and verification
- Estimated time: 2-3 hours
- **Note**: Can run in parallel with Plan 1

### Step 3: Execution Instructions for Each Agent

#### For Agent 1 (Backend API Wiring):

1. Open `PLAN-1-BACKEND-API-WIRING.md`
2. Read the plan thoroughly
3. Start with Task 1.1 (Wire STT Endpoint)
4. Make changes to `server/routes.ts`
5. Test after each task
6. Mark tasks as complete
7. Move to next task

**Key Files to Modify**:
- `server/routes.ts` (lines 336-361, 363-381, 590-609)

#### For Agent 2 (Telephony Bidirectional):

1. **Wait for Plan 1 to complete** (or at least Task 1.1 and 1.3)
2. Open `PLAN-2-TELEPHONY-BIDIRECTIONAL.md`
3. Start with Task 2.1 (Fix ML Client Reference)
4. Then Task 2.2 (Implement Bidirectional Audio)
5. Test thoroughly

**Key Files to Modify**:
- `server/services/telephony-service.ts`
- `server/routes.ts` (lines 1306-1437)

#### For Agent 3 (Frontend Integration):

1. **Wait for Plan 1 to complete** (APIs must work first)
2. Open `PLAN-3-FRONTEND-INTEGRATION.md`
3. Start with Task 3.1 (Remove Mock Data)
4. Work through each page systematically
5. Test each page after changes

**Key Files to Modify**:
- `client/src/pages/agent-flows.tsx`
- All other page files in `client/src/pages/`

#### For Agent 4 (ML Services Verification):

1. Can start immediately (no dependencies)
2. Open `PLAN-4-ML-SERVICES-VERIFICATION.md`
3. Start with Task 4.1 (Verify HF Spaces Endpoints)
4. Test all services
5. Document findings
6. Fix any issues found

**Key Files to Verify/Modify**:
- `server/hf-spaces-client.ts`
- `server/python-bridge.ts`
- Environment configuration

## Execution Order

### Phase 1: Parallel Start (Hour 1-2)
- **Agent 1**: Plan 1 (Backend API Wiring)
- **Agent 4**: Plan 4 (ML Services Verification)

### Phase 2: Dependent Tasks (Hour 3-6)
- **Agent 2**: Plan 2 (Telephony) - After Plan 1 complete
- **Agent 3**: Plan 3 (Frontend) - After Plan 1 complete

### Phase 3: Integration (Hour 7-8)
- All agents: Final testing and integration
- Bug fixes
- Documentation

## Coordination Tips

### File Conflicts

**Low Risk** (Different files):
- Agent 1: `server/routes.ts` (STT/VAD/VLLM sections)
- Agent 2: `server/routes.ts` (Telephony sections)
- Agent 3: `client/src/pages/*.tsx`
- Agent 4: `server/hf-spaces-client.ts`

**Medium Risk** (Same file, different sections):
- Agent 1 and Agent 2 both modify `server/routes.ts`
  - **Solution**: Agent 1 works on lines 336-609
  - **Solution**: Agent 2 works on lines 1306-1437
  - **Coordination**: Agent 2 should wait for Agent 1 to finish

### Communication

1. **Check progress**: Review each plan's checklist
2. **Report blockers**: If stuck, note in plan file
3. **Test incrementally**: Test after each major change
4. **Commit frequently**: Small, testable commits

## Success Criteria

After all plans complete:

- [ ] All mock endpoints replaced with real ML calls
- [ ] Telephony bidirectional audio works
- [ ] Frontend uses real APIs (no mocks)
- [ ] All ML services verified and working
- [ ] End-to-end tests pass
- [ ] Production ready

## Quick Reference

### Plan 1: Backend API Wiring
- **Priority**: Critical
- **Dependencies**: None
- **Blocks**: Plans 2 and 3

### Plan 2: Telephony Bidirectional
- **Priority**: Critical
- **Dependencies**: Plan 1
- **Blocks**: None

### Plan 3: Frontend Integration
- **Priority**: High
- **Dependencies**: Plan 1
- **Blocks**: None

### Plan 4: ML Services Verification
- **Priority**: Critical
- **Dependencies**: None
- **Blocks**: None

## Getting Started

1. **Open 4 Cursor windows** (or agent sessions)
2. **Assign one plan to each window**
3. **Read the plan file thoroughly**
4. **Start with the first task**
5. **Test after each change**
6. **Mark tasks complete as you go**

## Need Help?

- Each plan file has detailed instructions
- Each task has code examples
- Success criteria are clearly defined
- Test commands are provided

Good luck! 🚀

