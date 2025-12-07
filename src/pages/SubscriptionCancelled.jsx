import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowRight, ArrowLeft } from "lucide-react";

export default function SubscriptionCancelled() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(createPageUrl("Home"));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-gray-50 dark:from-gray-900 dark:via-orange-950/10 dark:to-gray-900 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full border-2 border-orange-200 dark:border-orange-800 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <XCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-gray-900 dark:text-white">
            Subscription Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Your subscription process was cancelled. No charges have been made.
          </p>
          
          <div className="bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
              You will be redirected to the homepage in <span className="text-2xl font-black text-orange-600 dark:text-orange-400">{countdown}</span> seconds
            </p>
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              onClick={() => navigate(createPageUrl("SubscriptionCheckout"))}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("Home"))}
              className="font-bold"
            >
              Go to Homepage
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p>Need help? Contact support or try subscribing again when you're ready.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}