import React from 'react';

function useSyncStatus() {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setIsOnline((current) => !current);
    }, 8000);

    return () => window.clearInterval(timer);
  }, []);

  return {
    isOnline,
    label: isOnline ? 'Online' : 'Offline',
    tone: isOnline ? 'online' : 'offline',
  };
}

export default useSyncStatus;