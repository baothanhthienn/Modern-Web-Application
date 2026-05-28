function buildPlaceholderImage(accentColor, label, subtitle) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
      <rect width="1200" height="630" rx="40" fill="#F7F7F8"/>
      <rect x="36" y="36" width="1128" height="558" rx="30" fill="url(#panel)"/>
      <rect x="84" y="84" width="340" height="462" rx="28" fill="${accentColor}" fill-opacity="0.18"/>
      <rect x="110" y="110" width="288" height="288" rx="26" fill="${accentColor}"/>
      <text x="254" y="282" text-anchor="middle" font-size="120" font-family="Arial, sans-serif" font-weight="700" fill="white">${label}</text>
      <text x="484" y="210" font-size="42" font-family="Arial, sans-serif" font-weight="700" fill="#101828">${subtitle}</text>
      <text x="484" y="272" font-size="24" font-family="Arial, sans-serif" fill="#475467">Local showcase post for the team profile fallback.</text>
      <text x="484" y="332" font-size="24" font-family="Arial, sans-serif" fill="#475467">Static JSON only. No backend dependency.</text>
      <rect x="484" y="390" width="228" height="52" rx="26" fill="white"/>
      <text x="598" y="423" text-anchor="middle" font-size="22" font-family="Arial, sans-serif" font-weight="700" fill="#101828">Team contribution</text>
      <defs>
        <linearGradient id="panel" x1="104" y1="76" x2="1054" y2="562" gradientUnits="userSpaceOnUse">
          <stop stop-color="white"/>
          <stop offset="1" stop-color="#F3F4F6"/>
        </linearGradient>
      </defs>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const TEAM_PROFILES = [
  {
    id: 1001,
    username: 'nikila_hindagolla',
    displayName: 'Nikila Hindagolla',
    studentId: '105948891',
    avatarUrl: null,
    bannerColor: '#FFF4ED',
    accentColor: '#FF6B35',
    bio: 'Owned the feed-first experience and the search flow that makes discovery feel immediate.',
    ownership: ['Home Page', 'Search Page'],
  },
  {
    id: 1002,
    username: 'hiruna_chamuditha',
    displayName: 'Hiruna Chamuditha',
    studentId: '105236839',
    avatarUrl: null,
    bannerColor: '#F4F1FF',
    accentColor: '#6E56CF',
    bio: 'Built the public identity surfaces and the notification stream that keeps the app state readable.',
    ownership: ['Profile Detail Page', 'Notification Page'],
  },
  {
    id: 1003,
    username: 'nguyen_gia_bao_pham',
    displayName: 'Nguyen Gia Bao Pham',
    studentId: '105292789',
    avatarUrl: null,
    bannerColor: '#ECFDF3',
    accentColor: '#039855',
    bio: 'Focused on live messaging behavior, room presence, and the inbox experience for direct chat.',
    ownership: ['Real Time Chat Page', 'Inbox Page'],
  },
  {
    id: 1004,
    username: 'leon_nhor',
    displayName: 'Leon Nhor',
    studentId: '104004239',
    avatarUrl: null,
    bannerColor: '#EEF4FF',
    accentColor: '#1D4ED8',
    bio: 'Handled account entry points so registration and sign-in stay clear, compact, and reliable.',
    ownership: ['Create Account Page', 'Login Page'],
  },
  {
    id: 1005,
    username: 'gurushanth_brammananthan',
    displayName: 'Gurushanth Brammananthan',
    studentId: '105342930',
    avatarUrl: null,
    bannerColor: '#FFF7E8',
    accentColor: '#C8811A',
    bio: 'Covered the narrative pages in the product, including the post view and this team overview surface.',
    ownership: ['Team Page', 'Post Page'],
  },
]

export const teamMembers = TEAM_PROFILES.map((member) => ({
  ...member,
  initials: member.displayName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(),
}))

export const teamProfilesByUsername = Object.fromEntries(teamMembers.map((member) => [member.username, {
  username: member.username,
  displayName: member.displayName,
  bio: member.bio,
  avatarUrl: member.avatarUrl,
  bannerColor: member.bannerColor,
  postKarma: 0,
  commentKarma: 0,
  followers: 0,
  cakeDay: '2026-05-26T00:00:00.000Z',
  communities: member.ownership.map((area, index) => ({
    name: area.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    memberCount: index + 1,
  })),
  ownership: member.ownership,
  studentId: member.studentId,
  accentColor: member.accentColor,
}]))

export const teamPosts = teamMembers.map((member, index) => ({
  id: `team-post-${member.username}`,
  community: 'team',
  communityColor: member.accentColor,
  author: member.username,
  createdAt: new Date(Date.UTC(2026, 4, 26 - index, 9, 0, 0)).toISOString(),
  flair: 'Contributor',
  flairColor: member.bannerColor,
  title: `${member.displayName} - ${member.ownership.join(' and ')}`,
  image: buildPlaceholderImage(member.accentColor, member.initials, member.displayName),
  text: `This local spotlight post highlights ${member.displayName}'s contribution across ${member.ownership.join(' and ')}.`,
  link: null,
  linkDomain: null,
  votes: 0,
  comments: 0,
  reactions: 0,
  userVote: 0,
  saved: false,
  localOnly: true,
}))

export const teamPostsByUsername = Object.fromEntries(teamPosts.map((post) => [post.author, [post]]))
export const teamPostsById = Object.fromEntries(teamPosts.map((post) => [String(post.id), post]))
