// import { createServerClient } from '@supabase/ssr'
// import { NextResponse } from 'next/server'
// import type { NextRequest } from 'next/server'
// // import type { CookieOptions } from '@supabase/ssr'
// import { Database } from '@/types/database'

// export async function middleware(req: NextRequest) {
//   let response = NextResponse.next({
//     request: {
//       headers: req.headers,
//     },
//   })

//   const supabase = createServerClient<Database>(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return req.cookies.getAll()
//         },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value, options }) => {
//             req.cookies.set(name, value)
//             response = NextResponse.next({
//               request: {
//                 headers: req.headers,
//               },
//             })
//             response.cookies.set(name, value, options)
//           })
//         },
//       },
//     }
//   )

//   // SÄKER: Använd getUser() istället för getSession()
//   const {
//     data: { user },
//   } = await supabase.auth.getUser()

//   // Skyddade rutter
//   if (req.nextUrl.pathname.startsWith('/dashboard')) {
//     if (!user) {
//       return NextResponse.redirect(new URL('/login', req.url))
//     }

//     // SÄKER: Använd verifierat user.id
//     const { data: profile } = await supabase
//       .from('profiles')
//       .select('is_approved')
//       .eq('id', user.id)
//       .single()

//     if (!profile?.is_approved) {
//       return NextResponse.redirect(new URL('/pending', req.url))
//     }
//   }

//   return response
// }

// export const config = {
//   matcher: ['/dashboard/:path*']
// }

// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // SÄKER: Använd getUser() istället för getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Skyddade rutter - nu inkluderar både dashboard och patients
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // SÄKER: Använd verifierat user.id
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('id', user.id)
      .single()

    if (!profile?.is_approved) {
      return NextResponse.redirect(new URL('/pending', req.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*']
}
