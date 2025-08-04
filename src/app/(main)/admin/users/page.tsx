"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  CreditCard,
  Crown,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';

interface User {
  id: string;
  email?: string;
  user_metadata: any;
  created_at: string;
  last_sign_in_at?: string;
  subscription_status?: string;
  plan_type?: string;
  credits?: number;
  plan?: string;
  total_credits_earned?: number;
  total_credits_used?: number;
}

interface UserMeta {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  credits: number;
  plan: string;
  total_credits_earned: number;
  total_credits_used: number;
  created_at: string;
  updated_at?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [userMeta, setUserMeta] = useState<UserMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingCredits, setEditingCredits] = useState<number>(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch user metadata directly (this contains all user info)
      const userMetaData = await fetchUserMetadata();

      // Transform user metadata into the expected format
      const enrichedUsers = userMetaData.map(meta => ({
        id: meta.id,
        email: meta.email || 'No email',
        user_metadata: {
          name: meta.name || 'Unknown User',
          avatar_url: meta.avatar_url
        },
        created_at: meta.created_at,
        last_sign_in_at: meta.updated_at,
        credits: meta.credits || 0,
        plan: meta.plan || 'free',
        total_credits_earned: meta.total_credits_earned || 0,
        total_credits_used: meta.total_credits_used || 0
      }));

      setUsers(enrichedUsers);
      setUserMeta(userMetaData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserMetadata = async (): Promise<UserMeta[]> => {
    try {
      // Use backend API to bypass RLS
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error("Error fetching user metadata:", error);
      throw error;
    }
  };

  const updateUserCredits = async (userId: string, newCredits: number) => {
    try {
      const { error } = await supabase
        .from('users_meta')
        .update({ credits: newCredits })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      toast.success('User credits updated successfully');
      setShowEditModal(false);
      fetchUsers(); // Refresh the data
    } catch (error) {
      console.error('Error updating user credits:', error);
      toast.error('Failed to update user credits');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from users_meta first
      const { error: metaError } = await supabase
        .from('users_meta')
        .delete()
        .eq('id', userId);

      if (metaError) {
        throw metaError;
      }

      toast.success('User deleted successfully');
      fetchUsers(); // Refresh the data
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['ID', 'Name', 'Email', 'Plan', 'Credits', 'Credits Used', 'Joined Date'],
      ...users.map(user => [
        user.id,
        user.user_metadata?.name || 'Unknown',
        user.email || '',
        user.plan || 'free',
        user.credits || 0,
        user.total_credits_used || 0,
        new Date(user.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Users exported successfully');
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro': return '👑';
      case 'creator': return '🎨';
      case 'starter': return '⭐';
      default: return '👤';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'default';
      case 'creator': return 'secondary';
      case 'starter': return 'outline';
      default: return 'outline';
    }
  };

  const columns = [
    {
      key: 'user',
      label: 'User',
      render: (value: any, row: any) => (
        <div className="flex items-center gap-3">
          {row.user_metadata?.avatar_url ? (
            <img
              src={row.user_metadata.avatar_url}
              alt="avatar"
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {row.user_metadata?.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <p className="font-medium">{row.user_metadata?.name || 'Unknown User'}</p>
            <p className="text-xs text-muted-foreground">ID: {row.id.slice(0, 8)}...</p>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true
    },
    {
      key: 'plan',
      label: 'Plan',
      sortable: true,
      render: (value: any, row: any) => (
        <Badge variant={getPlanColor(row.plan)} className="text-xs">
          {getPlanIcon(row.plan)} {row.plan}
        </Badge>
      )
    },
    {
      key: 'credits',
      label: 'Credits',
      sortable: true,
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.credits || 0}</span>
          <span className="text-xs text-muted-foreground">
            (used: {row.total_credits_used || 0})
          </span>
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Joined',
      sortable: true,
      render: (value: any) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedUser(row);
              setShowUserDetails(true);
            }}
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedUser(row);
              setEditingCredits(row.credits || 0);
              setShowEditModal(true);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteUser(row.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage user accounts, credits, and subscriptions</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={exportUsers} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={fetchUsers} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                Registered users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pro Users</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.plan === 'pro').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Premium subscribers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Creator Users</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.plan === 'creator').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Creator subscribers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.reduce((sum, u) => sum + (u.credits || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Available credits
              </p>
            </CardContent>
          </Card>
        </div>

        {/* DataTable */}
        <DataTable
          data={users}
          columns={columns}
          title="All Users"
          searchPlaceholder="Search users by name, email, or plan..."
          itemsPerPage={15}
        />
      </div>
    </div>
  );
} 