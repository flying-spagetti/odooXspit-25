# Production Readiness Checklist

## Environment Variables Required

### Backend (`server/.env`)
```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/database

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Configuration (REQUIRED - must be at least 32 characters)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (`odooxspit/.env`)
```env
# API Configuration
VITE_API_URL=https://your-api-domain.com/api
```

## Critical Security Requirements

1. **JWT_SECRET**: Must be set and at least 32 characters long
2. **Database**: Use SSL connections in production
3. **CORS**: Configure allowed origins properly
4. **Environment**: Set NODE_ENV=production

## Pre-Deployment Checklist

- [ ] Set all environment variables
- [ ] Run database migrations
- [ ] Test all features end-to-end
- [ ] Verify authentication works
- [ ] Check role-based access (if implemented)
- [ ] Test stock updates and validation
- [ ] Verify audit trail (move_history)
- [ ] Test error handling
- [ ] Build frontend for production
- [ ] Build backend for production
- [ ] Set up production database
- [ ] Configure CORS for production domain
- [ ] Set up SSL/HTTPS
- [ ] Configure logging
- [ ] Set up monitoring/error tracking

## Known Issues to Address

1. Role-based access control not enforced (all authenticated users have same permissions)
2. No rate limiting (vulnerable to brute force attacks)
3. Input validation is basic (needs improvement)
4. No request logging for production debugging
5. Email validation could be stricter
6. Password strength not enforced

