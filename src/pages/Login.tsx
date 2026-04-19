import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Mail, Lock, User, KeyRound, Eye, EyeOff, Smartphone } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle, completeGoogleSignup, isAuthenticated } = useAuth();
  
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);
  
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'google_phone'>('email');
  const [loading, setLoading] = useState(false);
  const [signupStep, setSignupStep] = useState(1); // 1: details, 2: OTP
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleUserData, setGoogleUserData] = useState<{uid: string, name: string, email: string} | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await loginWithGoogle();
      if (result.isNewUser && result.uid && result.name && result.email) {
        setGoogleUserData({
          uid: result.uid,
          name: result.name,
          email: result.email
        });
        setAuthMethod('google_phone');
        setSignupStep(1);
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMethod === 'google_phone' && signupStep === 1) {
      setLoading(true);
      setTimeout(() => {
        setSignupStep(2);
        setLoading(false);
        toast.success(`OTP sent to ${formData.phone}`);
      }, 1000);
      return;
    }

    if (authMethod === 'google_phone' && signupStep === 2 && googleUserData) {
      if (otp !== "123456") {
        toast.error("Invalid OTP. Please enter 123456 for demo.");
        return;
      }
      setLoading(true);
      try {
        await completeGoogleSignup(googleUserData.uid, googleUserData.name, googleUserData.email, formData.phone);
        navigate("/");
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    if (authMethod === 'phone' && signupStep === 1) {
      setLoading(true);
      setTimeout(() => {
        setSignupStep(2);
        setLoading(false);
        toast.success(`OTP sent to ${formData.phone}`);
      }, 1000);
      return;
    }

    if (authMethod === 'phone' && signupStep === 2) {
      if (otp !== "123456") {
        toast.error("Invalid OTP. Please enter 123456 for demo.");
        return;
      }
      setLoading(true);
      setTimeout(() => {
        toast.success("Phone verified successfully!");
        navigate("/");
      }, 500);
      return;
    }

    if (!isLogin && signupStep === 1) {
      // Move to OTP step
      setLoading(true);
      setTimeout(() => {
        setSignupStep(2);
        setLoading(false);
        toast.success(`OTP sent to ${formData.email}`);
      }, 1000);
      return;
    }

    if (!isLogin && signupStep === 2) {
      if (otp !== "123456") {
        toast.error("Invalid OTP. Please enter 123456 for demo.");
        return;
      }
    }

    setLoading(true);
    
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        if (formData.email === 'admin@ghumoo.com') {
          navigate("/admin-portal");
        } else {
          navigate("/");
        }
      } else {
        await signup(formData.name, formData.email, formData.password);
        navigate("/");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
              <Car className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isLogin ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? "Enter your email to sign in to your account" 
              : "Enter your details to join the Ghumoo community"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-3">
            <Button 
              variant="outline" 
              className="w-full relative py-5 bg-white text-gray-700 hover:bg-gray-50 border-gray-300 shadow-sm transition-all"
              onClick={handleGoogleLogin}
            >
              <div className="absolute left-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <span className="font-medium">Continue with Google</span>
            </Button>
          </div>
          
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with</span>
            </div>
          </div>
          
          <div className="flex mb-6 p-1 bg-gray-100 rounded-lg">
             <button 
               type="button"
               onClick={() => { setAuthMethod('email'); setSignupStep(1); }} 
               className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${authMethod === 'email' ? 'bg-white shadow border border-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
             >
               Email
             </button>
             <button 
               type="button"
               onClick={() => { setAuthMethod('phone'); setSignupStep(1); }} 
               className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${authMethod === 'phone' ? 'bg-white shadow border border-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
             >
               Mobile Number
             </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {signupStep === 2 ? (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
                  We've sent a verification code to <strong>{(authMethod === 'phone' || authMethod === 'google_phone') ? formData.phone : formData.email}</strong>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                      id="otp" 
                      placeholder="123456" 
                      className="pl-9"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">For demo purposes, enter: 123456</p>
                </div>
                <Button className="w-full h-11 text-base mt-6 bg-blue-600 hover:bg-blue-700" type="submit" disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Continue"}
                </Button>
                <Button variant="ghost" className="w-full" type="button" onClick={() => setSignupStep(1)}>
                  Back
                </Button>
              </div>
            ) : (
              <>
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        id="name" 
                        placeholder="John Doe" 
                        className="pl-9"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required={!isLogin}
                      />
                    </div>
                  </div>
                )}
                
                {authMethod === 'email' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="name@example.com" 
                          className="pl-9"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {isLogin && (
                          <a href="#" className="text-sm font-medium text-blue-600 hover:underline">
                            Forgot password?
                          </a>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"} 
                          className="pl-9 pr-10"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
                
                {(authMethod === 'phone' || authMethod === 'google_phone') && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Number</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="+91 98765 43210" 
                        className="pl-9"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        required
                      />
                    </div>
                    {authMethod === 'google_phone' && (
                       <p className="text-xs text-gray-500 mt-1">Please verify your phone number to complete signup with Google.</p>
                    )}
                  </div>
                )}

                <Button className="w-full h-11 text-base mt-6 bg-blue-600 hover:bg-blue-700 text-white" type="submit" disabled={loading}>
                  {loading ? "Please wait..." : (
                    (authMethod === 'phone' || authMethod === 'google_phone')
                      ? "Get OTP" 
                      : (isLogin ? "Sign In" : "Continue")
                  )}
                </Button>
              </>
            )}
          </form>

          {signupStep === 1 && authMethod !== 'google_phone' && (
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-500">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setSignupStep(1);
                }} 
                className="font-medium text-blue-600 hover:underline"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
