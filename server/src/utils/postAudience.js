export const privatePost = (post) => post?.visibility === 'CONNECTIONS' || /\[Connections Only\]/i.test(post?.title || '');

// Supabase relationship state wins when both stores know the same pair.
export async function postAudienceAuthors(viewerIds, prisma, supabase) {
  const authors = new Set(viewerIds);
  if (!viewerIds.length) return authors;
  const rows = await prisma.connection.findMany({ where: { status: 'ACCEPTED', OR: [
    { senderId: { in: viewerIds } }, { receiverId: { in: viewerIds } },
  ] } });
  for (const row of rows) authors.add(viewerIds.includes(row.senderId) ? row.receiverId : row.senderId);
  if (supabase) {
    const ids = viewerIds.filter(id => /^[0-9a-f-]{36}$/i.test(id));
    if (ids.length) {
      const { data, error } = await supabase.from('connections').select('sender_id,receiver_id,status')
        .or(ids.flatMap(id => [`sender_id.eq.${id}`, `receiver_id.eq.${id}`]).join(','));
      if (error) throw error; // Never grant access based on possibly stale relationships.
      for (const row of data || []) {
        const other = viewerIds.includes(row.sender_id) ? row.receiver_id : row.sender_id;
        if (row.status === 'ACCEPTED') authors.add(other);
        else authors.delete(other);
      }
    }
  }
  return authors;
}

export const postAudienceWhere = authors => ({ OR: [
  { title: null }, { NOT: { title: { contains: '[Connections Only]', mode: 'insensitive' } } },
  { authorId: { in: [...authors] } },
] });
