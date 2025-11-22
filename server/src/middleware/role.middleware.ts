import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions. Required role: ' + allowedRoles.join(' or '),
      });
    }

    next();
  };
};

// Convenience middleware for common roles
export const requireInventoryManager = requireRole('inventory_manager');
export const requireWarehouseStaff = requireRole('warehouse_staff');

