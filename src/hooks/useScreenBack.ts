import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export function useScreenBack(handler: () => void, visible = true) {
  const { setScreenBack } = useApp();

  useEffect(() => {
    setScreenBack(visible ? handler : null, visible);
    return () => setScreenBack(null, false);
  }, [handler, visible, setScreenBack]);
}
