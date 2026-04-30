import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { LeftPanel } from './components/layout/LeftPanel';
import { CenterPanel } from './components/layout/CenterPanel';
import { RightPanel } from './components/layout/RightPanel';
import { BottomBar } from './components/layout/BottomBar';
import { useWebSocket } from './hooks/useWebSocket';
import { getHardwareStatus } from './api/client';
import { useHardwareStore } from './store/useHardwareStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 8000, retry: 1 } },
});

// Hardware polling runs inside QueryClientProvider
function HardwarePoll() {
  const updateStatus = useHardwareStore((s) => s.updateStatus);
  const { data } = useQuery({
    queryKey: ['hardware-status'],
    queryFn: getHardwareStatus,
    refetchInterval: 10_000,
    retry: false,
  });
  useEffect(() => {
    if (data) updateStatus(data);
  }, [data, updateStatus]);
  return null;
}

function AppInner() {
  useWebSocket();
  return (
    <div className="app-layout">
      <Header />
      <div className="app-body">
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
      <BottomBar />
      <HardwarePoll />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
