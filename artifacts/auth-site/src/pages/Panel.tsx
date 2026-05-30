import { useState } from "react";
import { 
  useGetGuildStats, 
  useListGuildMembers, 
  useGetGuildConfig, 
  useUpsertGuildConfig 
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Particles } from "@/components/Particles";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Users, Shield, Calendar, Search, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Panel() {
  const [searchInput, setSearchInput] = useState("");
  const [activeGuildId, setActiveGuildId] = useState("");
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useGetGuildStats(activeGuildId, {
    query: { enabled: !!activeGuildId, queryKey: ["guildStats", activeGuildId] }
  });

  const { data: membersData, isLoading: membersLoading } = useListGuildMembers(activeGuildId, {
    query: { enabled: !!activeGuildId, queryKey: ["guildMembers", activeGuildId] }
  });

  const { data: config, isLoading: configLoading } = useGetGuildConfig(activeGuildId, {
    query: { enabled: !!activeGuildId, queryKey: ["guildConfig", activeGuildId] }
  });

  const upsertConfig = useUpsertGuildConfig();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setActiveGuildId(searchInput.trim());
    }
  };

  const handleSaveConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roleId = formData.get("roleId") as string;
    const webhookUrl = formData.get("webhookUrl") as string;

    upsertConfig.mutate({
      guildId: activeGuildId,
      data: { roleId: roleId || null, webhookUrl: webhookUrl || null }
    }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Configuration saved." });
      },
      onError: (err) => {
        toast({ title: "Error", description: "Failed to save config.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen relative p-6 md:p-12">
      <Particles />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Guild Control Panel</h1>
            <p className="text-muted-foreground mt-2">Manage verification settings and view members.</p>
          </div>
          
          <form onSubmit={handleSearch} className="flex w-full md:w-auto gap-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Enter Guild ID..." 
                className="pl-9 bg-card/50 border-white/10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit">Load</Button>
          </form>
        </header>

        {!activeGuildId ? (
          <div className="h-[400px] flex items-center justify-center border border-dashed border-border rounded-3xl bg-card/20 backdrop-blur-sm">
            <div className="text-center text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Enter a Guild ID above to view dashboard</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Stats */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card/40 backdrop-blur-md border-white/5 hover-glow">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Verified</CardTitle>
                  <Users className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{statsLoading ? "..." : stats?.totalVerified || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-card/40 backdrop-blur-md border-white/5 hover-glow">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
                  <Calendar className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{statsLoading ? "..." : stats?.todayVerified || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-card/40 backdrop-blur-md border-white/5 hover-glow">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
                  <Shield className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{statsLoading ? "..." : stats?.thisWeekVerified || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Config Form */}
            <Card className="lg:col-span-1 bg-card/60 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>Setup roles and webhooks</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveConfig} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="roleId">Verified Role ID</Label>
                    <Input 
                      id="roleId" 
                      name="roleId" 
                      defaultValue={config?.roleId || ""} 
                      placeholder="e.g. 1234567890" 
                      className="bg-background/50 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Log Webhook URL</Label>
                    <Input 
                      id="webhookUrl" 
                      name="webhookUrl" 
                      defaultValue={config?.webhookUrl || ""} 
                      placeholder="https://discord.com/api/webhooks/..." 
                      className="bg-background/50 font-mono"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={upsertConfig.isPending}>
                    {upsertConfig.isPending ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Members List */}
            <Card className="lg:col-span-2 bg-card/60 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle>Recent Verifications</CardTitle>
                <CardDescription>Latest members to pass verification</CardDescription>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading members...</div>
                ) : (
                  <div className="space-y-4">
                    {membersData?.members?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
                        No verified members yet.
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {membersData?.members?.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                            <div className="flex items-center gap-3">
                              {member.avatar ? (
                                <img src={member.avatar} alt={member.username} className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                                  {member.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{member.username}</p>
                                <p className="text-xs text-muted-foreground font-mono">{member.discordId}</p>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(member.verifiedAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
