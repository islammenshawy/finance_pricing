import { useState, useEffect, useCallback } from 'react';
import { CustomersListPage } from '@/components/customers/CustomersListPage';
import { LoanPricingPage } from '@/components/pricing/LoanPricingPage';
import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon, Monitor } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ToastProvider } from '@/components/ui/toast';
import type { Customer } from '@/lib/api';

type View = 'customers' | 'pricing';

// Get customer ID from URL
function getCustomerIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('customer');
}

// Update URL with customer ID
function updateUrl(customerId: string | null) {
  const url = new URL(window.location.href);
  if (customerId) {
    url.searchParams.set('customer', customerId);
  } else {
    url.searchParams.delete('customer');
  }
  window.history.pushState({}, '', url.toString());
}

export default function App() {
  // Initialize from URL
  const initialCustomerId = getCustomerIdFromUrl();
  const [view, setView] = useState<View>(initialCustomerId ? 'pricing' : 'customers');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const customerId = getCustomerIdFromUrl();
      if (customerId) {
        setSelectedCustomerId(customerId);
        setView('pricing');
      } else {
        setSelectedCustomerId(null);
        setView('customers');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setView('pricing');
    updateUrl(customer.id);
  }, []);

  const handleBack = useCallback(() => {
    setView('customers');
    setSelectedCustomerId(null);
    updateUrl(null);
  }, []);

  const { theme, toggleTheme } = useTheme();

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="h-screen flex flex-col bg-background">
          {/* Theme Toggle - Fixed position */}
          <button
            onClick={toggleTheme}
            className="fixed top-3 right-3 z-50 p-2 rounded-lg bg-card border shadow-lg hover:bg-muted transition-colors"
            title={`Theme: ${theme}`}
          >
            <ThemeIcon className="h-4 w-4" />
          </button>

          {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            <ErrorBoundary>
              {view === 'customers' && (
                <CustomersListPage onSelectCustomer={handleSelectCustomer} />
              )}
              {view === 'pricing' && selectedCustomerId && (
                <LoanPricingPage customerId={selectedCustomerId} onBack={handleBack} />
              )}
            </ErrorBoundary>
          </main>
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}
