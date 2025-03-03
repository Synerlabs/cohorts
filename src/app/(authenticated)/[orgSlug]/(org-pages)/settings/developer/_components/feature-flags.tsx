"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { isFeatureEnabled, enableFeature, disableFeature } from '@/lib/features';
import { useToast } from '@/components/ui/use-toast';

// List of features that can be toggled
const FEATURE_LIST = [
  {
    id: 'XENDIT_ENABLED',
    name: 'Xendit Payment Gateway',
    description: 'Show/hide Xendit payment gateway in payment settings'
  },
  // Add more feature flags here as needed
];

export function FeatureFlags() {
  const { toast } = useToast();
  const [features, setFeatures] = useState<{[key: string]: boolean}>({});
  
  // Load current feature flag values on mount
  useEffect(() => {
    const currentFeatures = FEATURE_LIST.reduce((acc, feature) => {
      acc[feature.id] = isFeatureEnabled(feature.id as any);
      return acc;
    }, {} as {[key: string]: boolean});
    
    setFeatures(currentFeatures);
  }, []);

  // Toggle a feature flag
  const toggleFeature = (featureId: string) => {
    const newValue = !features[featureId];
    
    if (newValue) {
      enableFeature(featureId as any);
    } else {
      disableFeature(featureId as any);
    }
    
    setFeatures(prev => ({
      ...prev,
      [featureId]: newValue
    }));
    
    toast({
      title: `Feature ${newValue ? 'enabled' : 'disabled'}`,
      description: `${featureId} has been ${newValue ? 'enabled' : 'disabled'}.`,
    });
  };

  // Reset page to apply changes
  const applyChanges = () => {
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Flags</CardTitle>
        <CardDescription>
          Toggle features during development. Changes will take effect after reload.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {FEATURE_LIST.map(feature => (
            <div key={feature.id} className="flex items-center justify-between space-y-2">
              <div>
                <Label htmlFor={`feature-${feature.id}`} className="font-medium">
                  {feature.name}
                </Label>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
              <Switch
                id={`feature-${feature.id}`}
                checked={features[feature.id] || false}
                onCheckedChange={() => toggleFeature(feature.id)}
              />
            </div>
          ))}
          
          <Button onClick={applyChanges} className="mt-4 w-full">
            Apply Changes (Reload Page)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 