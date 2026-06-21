export {}

declare global {
  interface UserPublicMetadata {
    role?: 'trainer' | 'trainee'
  }

  interface CustomJwtSessionClaims {
    publicMetadata?: {
      role?: 'trainer' | 'trainee'
    }
  }
}
