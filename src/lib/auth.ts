import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import EmailProvider from 'next-auth/providers/email'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

const providers = [
  // Email magic link for users - DISABLED for now
  // EmailProvider({
  //   server: {
  //     host: process.env.EMAIL_SERVER_HOST,
  //     port: process.env.EMAIL_SERVER_PORT,
  //     auth: {
  //       user: process.env.EMAIL_SERVER_USER,
  //       pass: process.env.EMAIL_SERVER_PASSWORD,
  //     },
  //   },
  //   from: process.env.EMAIL_FROM,
  // }),

  // Credentials provider for admin users and regular users
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Check if it's an admin user
        const adminUser = await prisma.adminUser.findUnique({
          where: { email: credentials.email }
        })

        if (adminUser) {
          const isValidPassword = await bcrypt.compare(credentials.password, adminUser.password)
          if (isValidPassword) {
            return {
              id: adminUser.id,
              email: adminUser.email,
              name: adminUser.name,
              role: adminUser.role,
              type: 'admin'
            }
          }
        }

        // Check if it's a regular user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (user && user.password) {
          const isValidPassword = await bcrypt.compare(credentials.password, user.password)
          if (isValidPassword) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              type: 'user'
            }
          }
        }

        // Check if it's a pub manager
        const manager = await prisma.manager.findUnique({
          where: { email: credentials.email },
          include: {
            pubs: {
              include: {
                pub: true
              }
            }
          }
        })

        if (manager) {
          // For now, managers don't have passwords - they use email magic links
          // This is a placeholder for future password-based manager auth
          return {
            id: manager.id,
            email: manager.email,
            name: manager.name,
            type: 'manager',
            pubs: manager.pubs.map(pm => ({
              id: pm.pub.id,
              name: pm.pub.name,
              role: pm.role
            }))
          }
        }

        return null
      }
    })
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.unshift(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
} else {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Google OAuth credentials not configured; skipping Google provider.')
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Handle admin users
        if (user.role) {
          token.role = user.role
          token.type = user.type
          token.pubs = user.pubs
        } else {
          // Handle regular users
          token.type = 'user'
        }
      }
      return token
    },
            async session({ session, token }) {
              if (token && session.user) {
                session.user.id = token.sub!
                session.user.type = token.type as string
                
                // Only add admin-specific fields for admin users
                if (token.type === 'admin') {
                  session.user.role = token.role as string
                  session.user.pubs = token.pubs as any[]
                }
              }
              return session
            }
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/verify-request',
    error: '/auth/error'
  }
}
