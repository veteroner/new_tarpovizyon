const TOUR_COMPLETED_KEY = 'teknova-tour-completed';

export function resetOnboardingTour() {
  localStorage.removeItem(TOUR_COMPLETED_KEY);
}

export function isOnboardingCompleted() {
  return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
}

export function markOnboardingCompleted() {
  localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
}

export { TOUR_COMPLETED_KEY };
