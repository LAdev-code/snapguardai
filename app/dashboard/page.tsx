import Card from '../components/Card';
import Button from '../components/Button';
import AuthGuard from '../components/AuthGuard';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex gap-2">
              <Button>Scan Receipt</Button>
              <Button variant="secondary">Check for Scams</Button>
            </div>
          </header>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>Quick Actions</Card>
            <Card>Mini Overview</Card>
            <Card>Financial Health</Card>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
