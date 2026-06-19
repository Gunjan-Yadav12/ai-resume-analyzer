import React from 'react'
import { usePuterStore } from '~/lib/puter';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

export const meta= () => {
  return [
    { title: "ResumeScore - Auth" },
    { name: "description", content: "Login or sign up to access your resume feedback and application tracking." },
  ];
}
const Auth = () => {
    const { isLoading , auth} = usePuterStore();
    const location = useLocation();
    const next = location.search.split('next=')[1];
    const navigate = useNavigate();

    useEffect(() => {
      if(auth.isAuthenticated) navigate(next);
    } , [auth.isAuthenticated , next])
    
  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen flex items-center justify-center">
      <div className="gradient-border shadow-lg">
        <section className="flex flex-col gap-8 bg-white rounded-2xl p-10">
          <div className="flex-col items-center gap-1 text center">
            <h1>Welcome</h1>
            <h2>Login to Continue Your Job Journey</h2>
          </div>
          <div>
            {isLoading ?(
              <button className="auth-button">
                <p>Signing you in... </p>
              </button>
            ): (
              <>
                  {auth.isAuthenticated ? (
                      <button className="auth-button" onClick={auth.signOut}>
                          <p>Log Out</p>
                      </button>
                ) : (
                      <button className="auth-button" onClick={auth.signIn}>
                          <p>Log In</p>
                      </button>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default Auth