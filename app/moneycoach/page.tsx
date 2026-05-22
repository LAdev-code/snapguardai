import Card from '../components/Card';
import AuthGuard from '../components/AuthGuard';

export default function MoneyCoachPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <header>
            <h1 className="text-2xl font-bold">Money Coach</h1>
            <p className="text-sm">Financial health and personalized tips.</p>
          </header>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>Financial Health Gauge (placeholder)</Card>
            <Card>Total Spent</Card>
            <Card>Top Category</Card>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
