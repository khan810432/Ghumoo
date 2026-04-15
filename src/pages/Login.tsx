import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Mail, Lock, User, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [signupStep, setSignupStep] = useState(1); // 1: details, 2: OTP
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        navigate("/onboarding");
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && signupStep === 2 ? (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
                  We've sent a verification code to <strong>{formData.email}</strong>
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
                <Button className="w-full h-11 text-base mt-6" type="submit" disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Create Account"}
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

                <Button className="w-full h-11 text-base mt-6" type="submit" disabled={loading}>
                  {loading ? "Please wait..." : (isLogin ? "Sign In" : "Continue")}
                </Button>
              </>
            )}
          </form>

          {(!(!isLogin && signupStep === 2)) && (
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
          
          {isLogin && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-700">Demo Credentials:</p>
              <p>Admin: admin@ghumoo.com / admin123</p>
              <p>User: user@test.com / any password</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
