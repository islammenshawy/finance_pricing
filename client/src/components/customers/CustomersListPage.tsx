import { useState, useEffect } from 'react';
import { getCustomers, type Customer } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

interface CustomersListPageProps {
  onSelectCustomer: (customer: Customer) => void;
}

export function CustomersListPage({ onSelectCustomer }: CustomersListPageProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCustomers();
        setCustomers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading customers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Customers</h2>
      <div className="grid gap-4">
        {customers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => onSelectCustomer(customer)}
            className="bg-card border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{customer.name}</h3>
                  <Badge variant="outline">{customer.code}</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {customer.country} • {customer.industry}
                </div>
              </div>
              <div className="text-right">
                {customer.creditRating && (
                  <Badge variant="secondary" className="mb-1">
                    {customer.creditRating}
                  </Badge>
                )}
                {customer.relationshipManager && (
                  <div className="text-xs text-muted-foreground">
                    RM: {customer.relationshipManager}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
