import { Suspense } from 'react';
import SnapsortForm from './snapsort-form';

export default function SnapSortPage() {
  return (
    <Suspense>
      <SnapsortForm />
    </Suspense>
  );
}
