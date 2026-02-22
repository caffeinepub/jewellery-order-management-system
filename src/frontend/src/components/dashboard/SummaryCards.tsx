import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Weight, Hash, Users } from 'lucide-react';
import { OrderType, Order } from '@/backend';

interface SummaryCardsProps {
  orders: Order[];
  isLoading?: boolean;
}

export default function SummaryCards({ orders, isLoading = false }: SummaryCardsProps) {
  const totalOrders = orders.length;
  const totalWeight = orders.reduce((sum, order) => sum + order.weight, 0);
  const totalQuantity = orders.reduce((sum, order) => sum + Number(order.quantity), 0);
  const customerOrders = orders.filter((order) => order.orderType === OrderType.CO).length;

  const cards = [
    {
      title: 'Total Orders',
      value: totalOrders,
      icon: Package,
    },
    {
      title: 'Total Weight',
      value: `${totalWeight.toFixed(2)}g`,
      icon: Weight,
    },
    {
      title: 'Total Quantity',
      value: totalQuantity,
      icon: Hash,
    },
    {
      title: 'Customer Orders',
      value: customerOrders,
      icon: Users,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-semibold">{card.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
