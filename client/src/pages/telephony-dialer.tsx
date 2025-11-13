import { useState, useEffect } from "react";
import { PhoneCall, Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useQuery } from "@tanstack/react-query";
import { getTelephonyClient, type CallState, type CallStatus } from "@/lib/telephony-client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TelephonyDialer() {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callState, setCallState] = useState<CallState | null>(null);
  const [volume, setVolume] = useState(100);
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: apiKeys } = useQuery<any[]>({
    queryKey: ["/api/keys"],
  });

  const activeApiKey = apiKeys?.find(k => k.isActive);

  useEffect(() => {
    if (!activeApiKey) return;

    let client = getTelephonyClient(activeApiKey.key);
    
    // Set initial state immediately
    setCallState(client.getState());
    
    const unsubscribe = client.onStateChange((state) => {
      setCallState(state);
    });

    const connectClient = async () => {
      try {
        setIsConnecting(true);
        await client.connect();
        setIsConnecting(false);
      } catch (error: any) {
        console.error('Failed to connect telephony client:', error);
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: error.message || "Could not connect to telephony service",
        });
        setIsConnecting(false);
      }
    };

    connectClient();

    return () => {
      unsubscribe();
      client.disconnect();
    };
  }, [activeApiKey, toast]);

  const handleDial = async () => {
    if (!phoneNumber.trim() || !callState) return;

    try {
      const client = getTelephonyClient();
      await client.startCall(phoneNumber);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: error.message || "Could not initiate call",
      });
    }
  };

  const handleHangup = () => {
    const client = getTelephonyClient();
    client.endCall();
  };

  const handleNumberClick = (digit: string) => {
    if (callState?.status === 'in-progress') {
      const client = getTelephonyClient();
      client.sendDTMF(digit);
    } else {
      setPhoneNumber(phoneNumber + digit);
    }
  };

  const handleToggleMute = () => {
    const client = getTelephonyClient();
    client.toggleMute();
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    const client = getTelephonyClient();
    client.setVolume(newVolume / 100);
  };

  const handleBackspace = () => {
    setPhoneNumber(phoneNumber.slice(0, -1));
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: CallStatus) => {
    switch (status) {
      case 'connecting':
        return <Badge variant="secondary" className="bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Connecting...
        </Badge>;
      case 'ringing':
        return <Badge variant="secondary" className="bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
          Ringing...
        </Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200">
          Call Active
        </Badge>;
      case 'ended':
        return <Badge variant="secondary">Call Ended</Badge>;
      case 'failed':
        return <Badge variant="destructive">Call Failed</Badge>;
      default:
        return null;
    }
  };

  const isCallInProgress = callState?.status === 'in-progress' || callState?.status === 'ringing' || callState?.status === 'connecting';
  const canDial = callState?.status === 'idle' && phoneNumber.trim().length > 0;

  if (!activeApiKey) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-8 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <PhoneCall className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Web Dialer</h1>
            </div>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No active API key found. Please activate an API key to use the dialer.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-8 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <PhoneCall className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Web Dialer</h1>
            </div>
          </div>
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Connecting to telephony service...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <PhoneCall className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Web Dialer</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Make outbound calls using your voice agent
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dialer</CardTitle>
            <CardDescription>
              Enter a phone number and start your call
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Phone Number Display */}
            <div className="text-center">
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="text-2xl text-center h-16 font-mono"
                data-testid="input-phone-number"
                disabled={isCallInProgress}
              />
            </div>

            {/* Call Status */}
            {callState && callState.status !== 'idle' && (
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {getStatusBadge(callState.status)}
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {callState.phoneNumber || phoneNumber}
                </p>
                {callState.status === 'in-progress' && (
                  <p className="text-lg font-mono font-semibold">
                    {formatDuration(callState.duration)}
                  </p>
                )}
              </div>
            )}

            {/* Dialpad */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                <Button
                  key={digit}
                  variant="outline"
                  className="h-16 text-xl font-mono hover-elevate"
                  onClick={() => handleNumberClick(digit)}
                  data-testid={`button-digit-${digit}`}
                  disabled={isCallInProgress && callState?.status !== 'in-progress'}
                >
                  {digit}
                </Button>
              ))}
            </div>

            {/* Backspace for idle state */}
            {!isCallInProgress && phoneNumber.length > 0 && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  onClick={handleBackspace}
                  data-testid="button-backspace"
                >
                  Delete
                </Button>
              </div>
            )}

            {/* Call Controls */}
            <div className="flex justify-center gap-4 items-center">
              {!isCallInProgress ? (
                <Button
                  size="lg"
                  onClick={handleDial}
                  disabled={!canDial}
                  className="rounded-full h-16 w-16"
                  data-testid="button-call"
                >
                  <Phone className="h-6 w-6" />
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant={callState?.muted ? "default" : "outline"}
                    onClick={handleToggleMute}
                    className="rounded-full h-14 w-14"
                    data-testid="button-mute"
                    disabled={callState?.status !== 'in-progress'}
                  >
                    {callState?.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  <div className="flex items-center gap-2">
                    {volume === 0 ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-muted-foreground" />}
                    <Slider
                      value={[volume]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={1}
                      className="w-24"
                      data-testid="slider-volume"
                    />
                  </div>

                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleHangup}
                    className="rounded-full h-16 w-16"
                    data-testid="button-hangup"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
