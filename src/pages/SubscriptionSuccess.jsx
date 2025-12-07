import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-green-950/10 dark:to-gray-900 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full border-2 border-green-200 dark:border-green-800 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-gray-900 dark:text-white">
            Subscription Activated!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Your payment has been processed successfully. Your subscription is now active!
          </p>
          
          <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
              You will be redirected to the homepage in <span className="text-2xl font-black text-green-600 dark:text-green-400">{countdown}</span> seconds
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("Home"))}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold"
            >
              Go to Homepage
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="font-bold"
            >
              View Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}