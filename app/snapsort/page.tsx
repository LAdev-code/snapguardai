import Card from '../components/Card';
import Button from '../components/Button';
import AuthGuard from '../components/AuthGuard';

export default function SnapSortPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <header>
            <h1 className="text-2xl font-bold">SnapSortAI</h1>
            <p className="text-sm">Upload a receipt to analyze spending.</p>
          </header>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <div className="p-6">
                  <div className="border-2 border-dashed p-8 text-center rounded">Drop or select files</div>
                  <div className="mt-4 flex gap-2"><Button>Upload</Button><Button variant="secondary">Use Camera</Button></div>
                </div>
              </Card>
            </div>
            <aside>
              <Card>Insights panel</Card>
            </aside>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
