import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<{ error: Error | null; data: { user: User | null } }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data: { user: User | null } }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Get session first - don't block on health check
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        console.log('Session:', session ? 'found' : 'none');
        
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    };

    // Safety timeout: ensure loading stops after 5 seconds max
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.log('Safety timeout: forcing isLoading false');
        setIsLoading(false);
      }
    }, 5000);

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    console.log('Fetching profile for:', userId);
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );
      
      // Race between query and timeout
      const result = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        timeoutPromise
      ]) as any;
      
      const { data, error } = result;

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (data) {
        console.log('Profile loaded:', data.name);
        setProfile(data);
      } else {
        console.log('No profile found');
      }
      return data;
    } catch (error: any) {
      console.error('Error fetching profile:', error.message || error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    setIsLoading(true);
    
    try {
      console.log('Starting signup for:', email);
      
      // Sign up with Supabase (no timeout - let it complete)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        setIsLoading(false);
        return { error: authError, data: { user: null } };
      }

      console.log('Auth success, user:', authData.user?.id);

      if (authData.user) {
        const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        
        console.log('Creating profile...');
        // Use upsert to handle case where profile already exists (e.g. from trigger)
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authData.user.id,
          name,
          email,
          phone,
          avatar,
        }, { onConflict: 'id' });

        if (profileError) {
          console.error('Profile upsert failed:', profileError);
        } else {
          console.log('Profile created/updated successfully');
        }

        await fetchProfile(authData.user.id);
      }

      setIsLoading(false);
      return { error: null, data: { user: authData.user } };
    } catch (error: any) {
      console.error('Signup error:', error);
      setIsLoading(false);
      return { error: error as Error, data: { user: null } };
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      console.log('Starting signin for:', email);
      
      // Sign in with Supabase (no timeout - let it complete)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Signin error:', error);
        setIsLoading(false);
        return { error, data: { user: null } };
      }

      console.log('Signin success, user:', data.user?.id);

      if (data.user) {
        setUser(data.user);
        const userProfile = await fetchProfile(data.user.id);
        
        // If no profile exists, try to create one
        if (!userProfile && data.user.email) {
          console.log('No profile found, creating one...');
          const name = data.user.user_metadata?.name || data.user.email.split('@')[0];
          const avatar = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
          
          const { error: createError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            name,
            email: data.user.email,
            phone: data.user.user_metadata?.phone || '',
            avatar,
          }, { onConflict: 'id' });
          
          if (!createError) {
            console.log('Profile created after signin');
            await fetchProfile(data.user.id);
          } else {
            console.error('Failed to create profile after signin:', createError);
          }
        }
      }

      setIsLoading(false);
      return { error: null, data: { user: data.user } };
    } catch (error: any) {
      console.error('Sign in error:', error);
      setIsLoading(false);
      return { error: error as Error, data: { user: null } };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsLoading(false);
  };

  const value = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
