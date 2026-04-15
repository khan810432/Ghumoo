import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Phone, FileText, CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function Onboarding() {
  const navigate = useNavigate();
  const { verifyUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);

  const handleSendEmailOtp = () => {
    setLoading(true);
    setTimeout(() => {
      setEmailOtpSent(true);
      setLoading(false);
      toast.success("OTP sent to your email");
    }, 1000);
  };

  const handleSendPhoneOtp = () => {
    setLoading(true);
    setTimeout(() => {
      setPhoneOtpSent(true);
      setLoading(false);
      toast.success("OTP sent to your phone");
    }, 1000);
  };

  const handleNext = () => {
    if (step === 1 && emailOtpSent && emailOtp !== "123456") {
      toast.error("Invalid OTP. Please enter 123456.");
      return;
    }
    if (step === 1 && !emailOtpSent) {
      handleSendEmailOtp();
      return;
    }

    if (step === 2 && phoneOtpSent && phoneOtp !== "123456") {
      toast.error("Invalid OTP. Please enter 123456.");
      return;
    }
    if (step === 2 && !phoneOtpSent) {
      handleSendPhoneOtp();
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (step < 4) {
        if (step === 3) {
          verifyUser();
        }
        setStep(step + 1);
      }
      else navigate("/");
    }, 1000);
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <div className="mb-8 flex justify-between items-center relative">
        <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2"></div>
        <div className="absolute left-0 top-1/2 h-1 bg-blue-600 -z-10 -translate-y-1/2 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold transition-colors ${step >= i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {i < step ? <CheckCircle2 className="h-6 w-6" /> : i}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {step === 1 && "Verify Email"}
            {step === 2 && "Verify Phone"}
            {step === 3 && "Identity Verification"}
            {step === 4 && "All Set!"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "We'll send a code to your email address."}
            {step === 2 && "We'll send an OTP to your mobile number."}
            {step === 3 && "Upload your Aadhaar card for safety."}
            {step === 4 && "Your profile is verified and ready to go."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input placeholder="you@example.com" className="pl-9" disabled={emailOtpSent} />
                </div>
              </div>
              {emailOtpSent && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <Label>Enter OTP</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="123456" 
                      className="pl-9" 
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-500">For demo purposes, enter: 123456</p>
                </div>
              )}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input placeholder="+91 98765 43210" className="pl-9" disabled={phoneOtpSent} />
                </div>
              </div>
              {phoneOtpSent && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <Label>Enter OTP</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="123456" 
                      className="pl-9"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-500">For demo purposes, enter: 123456</p>
                </div>
              )}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Aadhaar Number</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input placeholder="1234 5678 9012" className="pl-9" />
                </div>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 cursor-pointer transition-colors">
                <ShieldCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 font-medium">Click to upload Aadhaar front & back</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG or PDF (Max 5MB)</p>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="text-center py-8 space-y-4">
              <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-bold">Verification Complete</h3>
              <p className="text-gray-500">You can now post and join rides securely.</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleNext} disabled={loading}>
            {loading ? "Processing..." : 
              step === 1 && !emailOtpSent ? "Send OTP" :
              step === 2 && !phoneOtpSent ? "Send OTP" :
              step === 4 ? "Go to Dashboard" : "Verify & Continue"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
