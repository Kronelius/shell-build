import { useLocation } from 'react-router-dom';

export function useFromHere() {
  const { pathname, search } = useLocation();
  return { from: `${pathname}${search}` };
}
