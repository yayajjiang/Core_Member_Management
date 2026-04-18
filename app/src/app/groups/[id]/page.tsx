import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import CopyButton from '@/components/copy-button'

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
  const { data: group } = await supabase.from('groups').select('*').eq('id', id).single()
  if (!group) redirect('/')

  const { data: members } = await supabase
    .from('group_members')
    .select('profiles(id, name, avatar_url)')
    .eq('group_id', id)

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/invite/${group.invite_token}`

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.name ?? ''} />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 返回</Link>
        </div>

        <h1 className="text-2xl font-bold mb-1">{group.name}</h1>
        <p className="text-sm text-gray-500 mb-6">{(members ?? []).length} 名成员</p>

        {/* Members */}
        <div className="bg-white rounded-xl border p-4 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">成员</h2>
          <div className="space-y-2">
            {(members ?? []).map((m: any) => (
              <div key={m.profiles.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                  {m.profiles.name?.[0] ?? '?'}
                </div>
                <span className="text-sm text-gray-700">{m.profiles.name}</span>
                {m.profiles.id === user.id && <span className="text-xs text-gray-400">(你)</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Invite link */}
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold text-gray-800 mb-2">邀请链接</h2>
          <p className="text-xs text-gray-500 mb-2">发给朋友，他们登录后自动加入</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 text-xs border rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
            />
            <CopyButton text={inviteUrl} />
          </div>
        </div>
      </div>
    </div>
  )
}

