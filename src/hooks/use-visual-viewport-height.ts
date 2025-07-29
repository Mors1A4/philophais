"use client";

import { useEffect } from 'react';

/**
 * A React hook that tracks the browser's visual viewport height and applies it
 * as a CSS custom property (`--vh`) to the root HTML element.
 * This provides a reliable "100% height" value on mobile devices,
 * avoiding issues with dynamic browser toolbars.
 */
export const useVisualViewportHeight = () => {
  useEffect(() => {
    const setVhProperty = () => {
      // Use the visualViewport height if available, falling back to innerHeight.
      // The height is divided by 100 to create a "1vh" equivalent.
      document.documentElement.style.setProperty(
        '--vh',
        `${(window.visualViewport?.height ?? window.innerHeight)}px`
      );
    };

    setVhProperty(); // Set the value on initial load

    const visualViewport = window.visualViewport;

    // Use the visualViewport resize event if available, as it's more reliable
    // for mobile UI changes (e.g., keyboard, address bar).
    if (visualViewport) {
      visualViewport.addEventListener('resize', setVhProperty);
      return () => visualViewport.removeEventListener('resize', setVhProperty);
    }

    // Fallback for older browsers and desktop
    window.addEventListener('resize', setVhProperty);
    return () => window.removeEventListener('resize', setVhProperty);
  }, []);
};