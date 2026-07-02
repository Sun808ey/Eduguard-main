import { useEffect } from 'react';

const BODY_CLASSES = ['landing-page', 'login-page', 'dashboard-page', 'enrollment-page', 'not-found-page'];

export function useBodyClass(className) {
  useEffect(() => {
    BODY_CLASSES.forEach((value) => document.body.classList.remove(value));
    document.body.classList.add(className);

    return () => {
      document.body.classList.remove(className);
    };
  }, [className]);
}
