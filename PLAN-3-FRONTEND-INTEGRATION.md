# Plan 3: Frontend Integration & Cleanup - Remove Mocks and Verify API Calls

**Agent Assignment**: Agent 3  
**Priority**: High  
**Estimated Time**: 2-3 hours  
**Dependencies**: Plan 1 (Backend API Wiring) should be completed first

## Objective
Remove all mock data from frontend, verify all pages use real API calls, add proper error handling and loading states throughout the application.

## Current State
- Frontend structure is complete with all pages
- Some pages may use mock data (e.g., agent-flows.tsx)
- API integration needs verification
- Error handling may be incomplete
- Loading states may be missing

## Tasks

### Task 3.1: Remove Mock Data from Agent Flows Page
**File**: `client/src/pages/agent-flows.tsx`

**Current Issue**: Page may use `mockFlows` constant instead of API calls.

**Target Implementation**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { useApiKey } from '@/hooks/use-api-key'; // or wherever API key is stored

function AgentFlows() {
  const { apiKey } = useApiKey();
  
  const { data: flows, isLoading, error } = useQuery({
    queryKey: ['agent-flows'],
    queryFn: async () => {
      const response = await fetch('/api/agent-flows', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch flows: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!apiKey,
  });
  
  if (isLoading) {
    return <div>Loading flows...</div>;
  }
  
  if (error) {
    return <div>Error loading flows: {error.message}</div>;
  }
  
  // Use flows from API instead of mockFlows
  return (
    // ... render flows from API
  );
}
```

**Success Criteria**:
- [ ] Page loads real data from API
- [ ] Loading state displayed
- [ ] Error state handled
- [ ] No mock data used

---

### Task 3.2: Verify Dashboard Page API Integration
**File**: `client/src/pages/dashboard-connected.tsx`

**Action Items**:
- [ ] Verify page fetches real usage stats from `/api/usage`
- [ ] Verify API key authentication works
- [ ] Check loading states
- [ ] Verify error handling
- [ ] Test with real data

**Checklist**:
- [ ] Uses `useQuery` or `useEffect` to fetch data
- [ ] Includes Authorization header
- [ ] Handles loading state
- [ ] Handles error state
- [ ] Displays real metrics

---

### Task 3.3: Verify Voice Library Page
**File**: `client/src/pages/voice-library.tsx`

**Action Items**:
- [ ] Verify fetches from `/api/voice-library` (pre-built voices)
- [ ] Verify fetches from `/api/cloned-voices` (user clones)
- [ ] Check API integration
- [ ] Verify error handling
- [ ] Test voice selection

---

### Task 3.4: Verify Clone Voice Page
**File**: `client/src/pages/clone-voice.tsx`

**Action Items**:
- [ ] Verify posts to `/api/clone-voice`
- [ ] Check file upload handling
- [ ] Verify form validation
- [ ] Check success/error feedback
- [ ] Test all three cloning modes (instant, professional, synthetic)

**Key Checks**:
- [ ] Form data sent correctly
- [ ] Audio file uploaded properly
- [ ] API key included in request
- [ ] Response handling works
- [ ] User feedback (toast/notification) shown

---

### Task 3.5: Verify Voice Design Page
**File**: `client/src/pages/voice-design.tsx`

**Action Items**:
- [ ] Verify synthetic voice creation
- [ ] Check API integration
- [ ] Verify form submission
- [ ] Test voice generation

---

### Task 3.6: Verify Agent Flow Builder
**File**: `client/src/pages/agent-flow-builder.tsx`

**Action Items**:
- [ ] Verify saves to `/api/agent-flows/:id`
- [ ] Verify nodes saved to `/api/agent-flows/:id/nodes`
- [ ] Verify edges saved to `/api/agent-flows/:id/edges`
- [ ] Check API integration
- [ ] Test save/load functionality

---

### Task 3.7: Verify Playground Pages
**Files**: `client/src/pages/playground.tsx`, `client/src/pages/playground-console.tsx`

**Action Items**:
- [ ] Verify TTS API calls work
- [ ] Check WebSocket connections (if used)
- [ ] Verify audio playback
- [ ] Test error handling
- [ ] Check real-time updates

---

### Task 3.8: Verify Real-Time Lab Page
**File**: `client/src/pages/realtime-lab.tsx`

**Action Items**:
- [ ] Verify WebSocket connection to `/ws/realtime`
- [ ] Check audio input handling
- [ ] Verify STT → VLLM → TTS pipeline
- [ ] Check metrics display
- [ ] Test error handling

**Key Checks**:
- [ ] WebSocket connects successfully
- [ ] Audio chunks sent correctly
- [ ] Responses received and played
- [ ] Metrics update in real-time
- [ ] Connection errors handled

---

### Task 3.9: Verify Telephony Pages
**Files**: 
- `client/src/pages/telephony-dialer.tsx`
- `client/src/pages/telephony-batch.tsx`
- `client/src/pages/telephony-providers.tsx`

**Action Items**:
- [ ] Verify dialer calls `/api/telephony/calls`
- [ ] Verify batch uses `/api/telephony/campaigns`
- [ ] Verify providers CRUD operations
- [ ] Check form validation
- [ ] Test error handling
- [ ] Verify success feedback

---

### Task 3.10: Verify API Keys Page
**File**: `client/src/pages/api-keys.tsx`

**Action Items**:
- [ ] Verify fetches from `/api/keys`
- [ ] Verify create/delete operations
- [ ] Check admin authentication
- [ ] Test all CRUD operations
- [ ] Verify error handling

---

### Task 3.11: Verify Usage Page
**File**: `client/src/pages/usage.tsx`

**Action Items**:
- [ ] Verify fetches from `/api/usage`
- [ ] Check data visualization
- [ ] Verify real-time updates (if any)
- [ ] Test error handling

---

### Task 3.12: Add Error Boundaries
**File**: `client/src/App.tsx` (or create new component)

**Implementation**:
```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div role="alert" className="p-4 border border-red-300 rounded">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        {/* ... rest of app */}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

**Success Criteria**:
- [ ] Error boundary catches React errors
- [ ] User sees friendly error message
- [ ] Option to retry
- [ ] Errors logged for debugging

---

### Task 3.13: Add Consistent Error Handling
**Files**: All page files

**Action Items**:
- [ ] Add try-catch in all API calls
- [ ] Show user-friendly error messages
- [ ] Use toast notifications for errors
- [ ] Log errors for debugging
- [ ] Handle network errors
- [ ] Handle authentication errors

**Pattern**:
```typescript
try {
  const response = await fetch('/api/endpoint', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Handle auth error
    } else if (response.status === 429) {
      // Handle rate limit
    } else {
      throw new Error(`API error: ${response.statusText}`);
    }
  }
  
  const data = await response.json();
  // Use data
} catch (error) {
  console.error('API call failed:', error);
  toast.error(error.message || 'An error occurred');
}
```

---

### Task 3.14: Add Loading States
**Files**: All page files

**Action Items**:
- [ ] Add loading indicators for all API calls
- [ ] Use React Query's `isLoading` state
- [ ] Show skeleton loaders where appropriate
- [ ] Disable buttons during operations
- [ ] Show progress for long operations

**Pattern**:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['key'],
  queryFn: fetchData
});

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <DataDisplay data={data} />;
```

---

### Task 3.15: Verify API Key Management
**Files**: All pages that make API calls

**Action Items**:
- [ ] Verify API key is retrieved correctly
- [ ] Check API key is included in all requests
- [ ] Handle missing API key gracefully
- [ ] Redirect to API keys page if needed
- [ ] Show error if API key invalid

---

## Additional Tasks

### Task 3.16: Test All User Flows
**Action Items**:
1. [ ] Create API key
2. [ ] Clone voice (all three modes)
3. [ ] Create agent flow
4. [ ] Test TTS in playground
5. [ ] Make telephony call
6. [ ] View usage stats
7. [ ] Test real-time lab
8. [ ] Verify all CRUD operations

### Task 3.17: Performance Optimization
**Action Items**:
- [ ] Check for unnecessary re-renders
- [ ] Optimize API calls (debouncing, caching)
- [ ] Verify React Query caching works
- [ ] Check bundle size
- [ ] Optimize images/assets

### Task 3.18: Accessibility & UX
**Action Items**:
- [ ] Verify keyboard navigation
- [ ] Check screen reader compatibility
- [ ] Verify focus management
- [ ] Check color contrast
- [ ] Test on mobile devices

## Success Criteria (Final Checklist)

- [ ] No mock data in any page
- [ ] All pages use real API calls
- [ ] Error handling on all pages
- [ ] Loading states implemented
- [ ] User feedback (toasts) working
- [ ] Error boundaries in place
- [ ] API key management works
- [ ] All user flows tested
- [ ] No console errors
- [ ] Performance acceptable

## Notes

- This plan depends on Plan 1 (Backend API Wiring) - APIs must work first
- Use React Query for all data fetching (already set up)
- Use shadcn/ui toast component for notifications
- Test incrementally - one page at a time

## Files to Modify

1. `client/src/pages/agent-flows.tsx` - Remove mocks
2. `client/src/pages/dashboard-connected.tsx` - Verify API
3. `client/src/pages/voice-library.tsx` - Verify API
4. `client/src/pages/clone-voice.tsx` - Verify API
5. `client/src/pages/voice-design.tsx` - Verify API
6. `client/src/pages/agent-flow-builder.tsx` - Verify API
7. `client/src/pages/playground.tsx` - Verify API
8. `client/src/pages/realtime-lab.tsx` - Verify WebSocket
9. `client/src/pages/telephony-*.tsx` - Verify APIs
10. `client/src/pages/api-keys.tsx` - Verify API
11. `client/src/pages/usage.tsx` - Verify API
12. `client/src/App.tsx` - Add error boundary

## Dependencies

- **Requires**: Plan 1 (Backend API Wiring) - APIs must be working
- **Blocks**: None - This is frontend polish

