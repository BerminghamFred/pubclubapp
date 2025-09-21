import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      type?: string
      role?: string
      pubs?: any[]
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    type?: string
    role?: string
    pubs?: any[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    type?: string
    role?: string
    pubs?: any[]
  }
}
