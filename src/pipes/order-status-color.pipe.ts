import { Pipe, PipeTransform } from '@angular/core';

import { OrderStatus } from '../models';

@Pipe({
  name: 'orderStatusColor',
})
export class OrderStatusColorPipe implements PipeTransform {
  transform(status: OrderStatus | string | null): string {
    if (!status) return 'text-gray-600 bg-gray-500/10 border-gray-500/20';
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20';
      case 'paid':
        return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
      case 'shipped':
        return 'text-purple-600 bg-purple-500/10 border-purple-500/20';
      case 'delivered':
        return 'text-green-600 bg-green-500/10 border-green-500/20';
      case 'cancelled':
      case 'refunded':
        return 'text-red-600 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-600 bg-gray-500/10 border-gray-500/20';
    }
  }
}

@Pipe({
  name: 'orderStatusAppearance',
})
export class OrderStatusAppearancePipe implements PipeTransform {
  transform(status: OrderStatus | string | null): string {
    if (!status) return 'neutral';
    switch (status) {
      case 'pending':
        return 'warning';
      case 'paid':
        return 'primary';
      case 'shipped':
        return 'secondary';
      case 'delivered':
        return 'success';
      case 'cancelled':
      case 'refunded':
        return 'error';
      default:
        return 'neutral';
    }
  }
}
