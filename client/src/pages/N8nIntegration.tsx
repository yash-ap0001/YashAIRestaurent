import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle2, ExternalLink, Network, RefreshCw, Server, Trash2, Webhook } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
}

interface N8nConfig {
  n8nBaseUrl: string;
  apiKey: string;
}

interface N8nWorkflow {
  id: number;
  name: string;
  active: boolean;
  created: string;
  updated: string;
}

const eventOptions = [
  { value: "order.created", label: "Order Created" },
  { value: "order.updated", label: "Order Updated" },
  { value: "order.completed", label: "Order Completed" },
  { value: "kitchen.token.created", label: "Kitchen Token Created" },
  { value: "kitchen.token.updated", label: "Kitchen Token Updated" },
  { value: "bill.created", label: "Bill Created" },
  { value: "bill.paid", label: "Bill Paid" },
  { value: "customer.created", label: "Customer Created" }
];

export default function N8nIntegration() {
  const [activeTab, setActiveTab] = useState("webhooks");
  const [isAddWebhookOpen, setIsAddWebhookOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isRunWorkflowOpen, setIsRunWorkflowOpen] = useState(false);
  const [isTestWebhookOpen, setIsTestWebhookOpen] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    id: "",
    url: "",
    secret: "",
    events: [] as string[],
    active: true
  });
  const [configForm, setConfigForm] = useState({
    n8nBaseUrl: "",
    apiKey: ""
  });
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8nWorkflow | null>(null);
  const [workflowRunData, setWorkflowRunData] = useState("");
  const [testWebhookId, setTestWebhookId] = useState("");
  const [testEvent, setTestEvent] = useState("");
  const [testPayload, setTestPayload] = useState("");
  
  const { toast } = useToast();

  // Fetch all registered webhooks
  const { data: webhooks = [], isLoading: isLoadingWebhooks, refetch: refetchWebhooks } = useQuery({
    queryKey: ['/api/n8n/webhooks'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/n8n/webhooks');
        return await response.json();
      } catch (error) {
        console.error('Error fetching webhooks:', error);
        return [];
      }
    }
  });

  // Fetch n8n workflows if configured
  const { data: workflows = [], isLoading: isLoadingWorkflows, refetch: refetchWorkflows, isError: isWorkflowError } = useQuery({
    queryKey: ['/api/n8n/workflows'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/n8n/workflows');
        return await response.json();
      } catch (error) {
        console.error('Error fetching workflows:', error);
        return [];
      }
    },
    retry: false,
    enabled: activeTab === "workflows" // Only fetch when workflows tab is active
  });

  // Register webhook mutation
  const registerWebhook = useMutation({
    mutationFn: async (webhookData: Omit<WebhookConfig, "id"> & { id: string }) => {
      const response = await apiRequest('POST', '/api/n8n/webhooks', webhookData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Webhook registered",
        description: "Webhook has been successfully registered",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/n8n/webhooks'] });
      setIsAddWebhookOpen(false);
      setWebhookForm({
        id: "",
        url: "",
        secret: "",
        events: [],
        active: true
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to register webhook: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Delete webhook mutation
  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/n8n/webhooks/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Webhook deleted",
        description: "Webhook has been successfully removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/n8n/webhooks'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete webhook: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Update n8n configuration
  const updateConfig = useMutation({
    mutationFn: async (configData: N8nConfig) => {
      const response = await apiRequest('POST', '/api/n8n/config', configData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration updated",
        description: "n8n configuration has been successfully updated",
      });
      setIsConfigDialogOpen(false);
      // After updating config, try to fetch workflows again
      setTimeout(() => {
        refetchWorkflows();
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update configuration: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Run workflow mutation
  const runWorkflow = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await apiRequest('POST', `/api/n8n/workflows/${id}/execute`, { data });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Workflow executed",
        description: "Workflow has been successfully executed",
      });
      setIsRunWorkflowOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to execute workflow: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Test webhook mutation
  const testWebhook = useMutation({
    mutationFn: async ({ id, event, payload }: { id: string, event: string, payload?: any }) => {
      const response = await apiRequest('POST', `/api/n8n/test-webhook/${id}`, { 
        event,
        payload: payload ? JSON.parse(payload) : undefined
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Webhook tested",
        description: "Test webhook has been successfully triggered",
      });
      setIsTestWebhookOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to test webhook: ${error}`,
        variant: "destructive"
      });
    }
  });

  const handleEventChange = (event: string, checked: boolean) => {
    if (checked) {
      setWebhookForm({
        ...webhookForm,
        events: [...webhookForm.events, event]
      });
    } else {
      setWebhookForm({
        ...webhookForm,
        events: webhookForm.events.filter(e => e !== event)
      });
    }
  };

  const handleRegisterWebhook = () => {
    if (!webhookForm.id || !webhookForm.url || !webhookForm.secret || webhookForm.events.length === 0) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields and select at least one event",
        variant: "destructive"
      });
      return;
    }

    registerWebhook.mutate(webhookForm);
  };

  const handleUpdateConfig = () => {
    if (!configForm.n8nBaseUrl) {
      toast({
        title: "Validation error",
        description: "n8n URL is required",
        variant: "destructive"
      });
      return;
    }

    updateConfig.mutate(configForm);
  };

  const handleRunWorkflow = () => {
    if (!selectedWorkflow) return;
    
    let data;
    try {
      data = workflowRunData ? JSON.parse(workflowRunData) : {};
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please provide valid JSON data",
        variant: "destructive"
      });
      return;
    }

    runWorkflow.mutate({
      id: String(selectedWorkflow.id),
      data
    });
  };

  const handleTestWebhook = () => {
    if (!testWebhookId || !testEvent) {
      toast({
        title: "Validation error",
        description: "Please select a webhook and an event to test",
        variant: "destructive"
      });
      return;
    }

    let payload;
    try {
      payload = testPayload || undefined;
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please provide valid JSON data",
        variant: "destructive"
      });
      return;
    }

    testWebhook.mutate({
      id: testWebhookId,
      event: testEvent,
      payload
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">n8n Integration</h1>
          <p className="text-muted-foreground">
            Integrate YashHotelBot with n8n for workflow automation
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setIsConfigDialogOpen(true)}
            className="flex items-center"
          >
            <Server className="w-4 h-4 mr-2" />
            Configure n8n Connection
          </Button>
          <Button 
            variant="default" 
            onClick={() => setIsAddWebhookOpen(true)}
            className="flex items-center"
          >
            <Webhook className="w-4 h-4 mr-2" />
            Register Webhook
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Registered Webhooks</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchWebhooks()}
              className="flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          {isLoadingWebhooks ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : webhooks.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p>No webhooks registered yet. Create one to get started.</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setIsAddWebhookOpen(true)}
                >
                  Register Webhook
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {webhooks.map((webhook: WebhookConfig) => (
                <Card key={webhook.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30 px-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          <Webhook className="w-5 h-5 mr-2 text-muted-foreground" />
                          {webhook.id}
                        </CardTitle>
                        <CardDescription>
                          <a 
                            href={webhook.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center hover:underline"
                          >
                            {webhook.url}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={webhook.active ? "default" : "outline"}
                          className={webhook.active ? "bg-green-600" : ""}
                        >
                          {webhook.active ? "Active" : "Inactive"}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setTestWebhookId(webhook.id);
                            setTestEvent("");
                            setTestPayload("");
                            setIsTestWebhookOpen(true);
                          }}
                        >
                          Test
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => deleteWebhook.mutate(webhook.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 py-4">
                    <h4 className="text-sm font-semibold mb-2">Events</h4>
                    <div className="flex flex-wrap gap-2">
                      {webhook.events.map(event => (
                        <Badge key={event} variant="secondary">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="workflows" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">n8n Workflows</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchWorkflows()}
              className="flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          {isWorkflowError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>
                Could not connect to n8n. Please check your configuration.
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setIsConfigDialogOpen(true)}
                >
                  Configure n8n
                </Button>
              </AlertDescription>
            </Alert>
          ) : isLoadingWorkflows ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : workflows.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p>No workflows found in your n8n instance.</p>
                <Button 
                  className="mt-4" 
                  onClick={() => window.open(configForm.n8nBaseUrl, '_blank')}
                  disabled={!configForm.n8nBaseUrl}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open n8n
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div>
              <div className="mb-2 text-xs text-muted-foreground">
                Found {workflows.length} workflows
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.map((workflow: any) => (
                    <TableRow key={workflow.id}>
                      <TableCell className="font-medium">{workflow.name}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={workflow.active ? "default" : "outline"}
                          className={workflow.active ? "bg-emerald-600" : ""}
                        >
                          {workflow.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(workflow.updated).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedWorkflow(workflow);
                            setWorkflowRunData("");
                            setIsRunWorkflowOpen(true);
                          }}
                        >
                          Execute
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Integration Guide</CardTitle>
              <CardDescription>
                Learn how to integrate your n8n workflows with YashHotelBot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-semibold">Available Events</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventOptions.map(option => (
                    <TableRow key={option.value}>
                      <TableCell className="font-mono">{option.value}</TableCell>
                      <TableCell>{option.label}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <h3 className="text-lg font-semibold mt-6">Authentication</h3>
              <p>
                Each webhook request will include the following authentication headers:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>
                  <code className="bg-muted p-1 rounded">X-YashHotelBot-Signature</code>: 
                  HMAC SHA-256 signature of the payload using your webhook secret
                </li>
                <li>
                  <code className="bg-muted p-1 rounded">X-YashHotelBot-Event</code>: 
                  The name of the event that triggered the webhook
                </li>
              </ul>
              
              <h3 className="text-lg font-semibold mt-6">Example n8n Workflow</h3>
              <p>
                Here's a basic example of how to set up an n8n workflow that receives webhooks from YashHotelBot:
              </p>
              <ol className="list-decimal pl-6 space-y-2 mt-2">
                <li>Create a new workflow in n8n</li>
                <li>Add a Webhook node as the trigger</li>
                <li>Configure it as "Webhook Receiver"</li>
                <li>Copy the webhook URL from n8n and paste it in the "URL" field when registering a webhook here</li>
                <li>Generate a secure random string for the "Secret" field</li>
                <li>Select the events you want to receive notifications for</li>
                <li>Test the webhook to make sure it's working correctly</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Register Webhook Dialog */}
      <Dialog open={isAddWebhookOpen} onOpenChange={setIsAddWebhookOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Register New Webhook</DialogTitle>
            <DialogDescription>
              Create a new webhook to receive real-time event notifications
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="webhookId" className="text-right">
                  ID
                </Label>
                <Input 
                  id="webhookId" 
                  value={webhookForm.id} 
                  onChange={(e) => setWebhookForm({...webhookForm, id: e.target.value})}
                  placeholder="my-webhook-1"
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="webhookUrl" className="text-right">
                  URL
                </Label>
                <Input 
                  id="webhookUrl" 
                  value={webhookForm.url} 
                  onChange={(e) => setWebhookForm({...webhookForm, url: e.target.value})}
                  placeholder="https://n8n.example.com/webhook/..."
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="webhookSecret" className="text-right">
                  Secret
                </Label>
                <Input 
                  id="webhookSecret" 
                  value={webhookForm.secret} 
                  onChange={(e) => setWebhookForm({...webhookForm, secret: e.target.value})}
                  placeholder="your-secret-key"
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Status
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch 
                    checked={webhookForm.active} 
                    onCheckedChange={(checked) => setWebhookForm({...webhookForm, active: checked})}
                  />
                  <Label>{webhookForm.active ? "Active" : "Inactive"}</Label>
                </div>
              </div>
              
              <Separator className="my-2" />
              
              <Label className="mb-2">Events to Subscribe</Label>
              <div className="grid grid-cols-2 gap-2">
                {eventOptions.map(option => (
                  <div className="flex items-center space-x-2" key={option.value}>
                    <Checkbox 
                      id={option.value} 
                      checked={webhookForm.events.includes(option.value)}
                      onCheckedChange={(checked) => 
                        handleEventChange(option.value, checked as boolean)
                      }
                    />
                    <Label htmlFor={option.value}>{option.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddWebhookOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRegisterWebhook}
              disabled={registerWebhook.isPending}
            >
              {registerWebhook.isPending && (
                <div className="mr-2 animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure n8n Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configure n8n Connection</DialogTitle>
            <DialogDescription>
              Set up the connection to your n8n instance
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="n8nUrl" className="text-right">
                  n8n URL
                </Label>
                <Input 
                  id="n8nUrl" 
                  value={configForm.n8nBaseUrl} 
                  onChange={(e) => setConfigForm({...configForm, n8nBaseUrl: e.target.value})}
                  placeholder="https://n8n.example.com"
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="n8nApiKey" className="text-right">
                  API Key
                </Label>
                <Input 
                  id="n8nApiKey" 
                  value={configForm.apiKey} 
                  onChange={(e) => setConfigForm({...configForm, apiKey: e.target.value})}
                  placeholder="n8n_api_..."
                  type="password"
                  className="col-span-3"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsConfigDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateConfig}
              disabled={updateConfig.isPending}
            >
              {updateConfig.isPending && (
                <div className="mr-2 animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Workflow Dialog */}
      <Dialog open={isRunWorkflowOpen} onOpenChange={setIsRunWorkflowOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Execute Workflow</DialogTitle>
            <DialogDescription>
              {selectedWorkflow ? `Execute workflow: ${selectedWorkflow.name}` : 'Select a workflow to execute'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <Label htmlFor="workflowData">Input Data (JSON)</Label>
              <textarea 
                id="workflowData"
                value={workflowRunData}
                onChange={(e) => setWorkflowRunData(e.target.value)}
                placeholder="{}"
                className="min-h-[150px] p-2 border rounded-md"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRunWorkflowOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRunWorkflow}
              disabled={runWorkflow.isPending || !selectedWorkflow}
            >
              {runWorkflow.isPending && (
                <div className="mr-2 animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Webhook Dialog */}
      <Dialog open={isTestWebhookOpen} onOpenChange={setIsTestWebhookOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Test Webhook</DialogTitle>
            <DialogDescription>
              Send a test event to the selected webhook
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="webhookEvent" className="text-right">
                  Event
                </Label>
                <select
                  id="webhookEvent"
                  value={testEvent}
                  onChange={(e) => setTestEvent(e.target.value)}
                  className="col-span-3 p-2 border rounded-md"
                >
                  <option value="">Select an event</option>
                  {eventOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="testPayload">Custom Payload (Optional)</Label>
                <textarea 
                  id="testPayload"
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  placeholder="{}"
                  className="min-h-[100px] p-2 border rounded-md"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsTestWebhookOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleTestWebhook}
              disabled={testWebhook.isPending || !testEvent}
            >
              {testWebhook.isPending && (
                <div className="mr-2 animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}