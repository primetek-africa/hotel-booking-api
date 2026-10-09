import { Router } from "express";

// ----------------------------- Middlewares -----------------------------------

// -------------------------- Validator Schema ---------------------------------

// ----------------------------- Controllers -----------------------------------
import {
  createOneUser,
  updateOneUser,
  updateUserPhones,
  updateLastLoginUser
} from '../controllers/user/index.js';

// Create a new Router instance dedicated to the user resource
const userRouter = Router();

// -----------------------------------------------------------------------------
// POST /create → Create a new user
// Body: New user data
// -----------------------------------------------------------------------------
userRouter.post(
  '/create',
  createOneUser
);

// -----------------------------------------------------------------------------
// PUT /update → Update a user
// Body: User identifier and new user data
// -----------------------------------------------------------------------------
userRouter.put(
  '/update',
  updateOneUser
);

// -----------------------------------------------------------------------------
// PUT /update-phones → Update a user's phone numbers
// Body: User identifier and the full list of phone numbers
// -----------------------------------------------------------------------------
userRouter.put(
  '/update-phones',
  updateUserPhones
);

// -----------------------------------------------------------------------------
// POST /update-last-login → Update a user's session last login
// Body: User identifier
// -----------------------------------------------------------------------------
userRouter.post(
  '/update-last-login',
  updateLastLoginUser
);


export default userRouter;
