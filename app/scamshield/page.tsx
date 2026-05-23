import { Suspense } from 'react';
import ScamShieldForm from './scamshield-form';

export default function ScamShieldPage() {
  return (
    <Suspense>
      <ScamShieldForm />
    </Suspense>
  );
}
