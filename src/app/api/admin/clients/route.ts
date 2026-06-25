import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function authenticate(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization') || request.headers.get('x-admin-password');
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (!authHeader) return false;
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  return token === adminPassword;
}

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mappedClients = (data || []).map(client => ({
      id: client.id,
      name: client.name,
      systemPrompt: client.system_prompt,
      allowedDomain: client.allowed_domain,
      monthlyLimit: client.monthly_limit,
      messagesUsed: client.messages_used,
    }));

    return NextResponse.json({ clients: mappedClients });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, systemPrompt, allowedDomain, monthlyLimit } = body;

    // Validation
    if (!id || !name || !systemPrompt || !allowedDomain) {
      return NextResponse.json({ error: 'Missing required fields: id, name, systemPrompt, allowedDomain' }, { status: 400 });
    }

    // Client ID validation: alphanumeric & hyphen/underscore only
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id)) {
      return NextResponse.json({ error: 'Client ID must be alphanumeric, containing only letters, numbers, hyphens or underscores.' }, { status: 400 });
    }

    // Check if client with this ID already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (existingClient) {
      return NextResponse.json({ error: `A client with ID "${id}" already exists.` }, { status: 400 });
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('clients')
      .insert({
        id: id.trim(),
        name: name.trim(),
        system_prompt: systemPrompt.trim(),
        allowed_domain: allowedDomain.trim(),
        monthly_limit: monthlyLimit ? parseInt(monthlyLimit, 10) : 1000,
        messages_used: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mappedClient = {
      id: data.id,
      name: data.name,
      systemPrompt: data.system_prompt,
      allowedDomain: data.allowed_domain,
      monthlyLimit: data.monthly_limit,
      messagesUsed: data.messages_used,
    };

    return NextResponse.json({ client: mappedClient });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
