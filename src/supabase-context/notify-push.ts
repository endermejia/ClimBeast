import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import webpush from 'https://esm.sh/web-push@3.6.4';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function formatActorsText(
  actors: string[],
  lang: string,
  totalCount?: number,
): string {
  const count =
    totalCount && totalCount > actors.length ? totalCount : actors.length;
  if (actors.length === 0) {
    if (lang === 'en') return 'Someone';
    if (lang === 'de') return 'Jemand';
    return 'Alguien';
  }

  if (actors.length === 1) {
    if (count > 1) {
      const others = count - 1;
      if (lang === 'en')
        return `${actors[0]} and ${others} other${others > 1 ? 's' : ''}`;
      if (lang === 'de') return `${actors[0]} und ${others} andere`;
      return `${actors[0]} y ${others} más`;
    }
    return actors[0];
  }

  if (actors.length === 2 && count === 2) {
    if (lang === 'en') return `${actors[0]} and ${actors[1]}`;
    if (lang === 'de') return `${actors[0]} und ${actors[1]}`;
    return `${actors[0]} y ${actors[1]}`;
  }

  const others = count - 1;
  if (lang === 'en')
    return `${actors[0]} and ${others} other${others > 1 ? 's' : ''}`;
  if (lang === 'de') return `${actors[0]} und ${others} andere`;
  return `${actors[0]} y ${others} más`;
}

function getNotificationBody(
  type: string,
  lang: string,
  actorsText: string,
  actorCount: number,
  routeName?: string,
  text?: string,
): string {
  const hasRoute = !!routeName;
  const isPlural = actorCount > 1;

  switch (type) {
    case 'like': {
      if (lang === 'en') {
        return hasRoute
          ? `${actorsText} liked your ascent on '${routeName}'`
          : `${actorsText} liked your ascent`;
      }
      if (lang === 'de') {
        if (isPlural) {
          return hasRoute
            ? `${actorsText} mögen deine Begehung von '${routeName}'`
            : `${actorsText} mögen deine Begehung`;
        }
        return hasRoute
          ? `${actorsText} mag deine Begehung von '${routeName}'`
          : `${actorsText} mag deine Begehung`;
      }
      // Spanish default
      if (isPlural) {
        return hasRoute
          ? `A ${actorsText} les ha gustado tu encadene en '${routeName}'`
          : `A ${actorsText} les ha gustado tu encadene`;
      }
      return hasRoute
        ? `A ${actorsText} le ha gustado tu encadene en '${routeName}'`
        : `A ${actorsText} le ha gustado tu encadene`;
    }

    case 'comment': {
      if (lang === 'en') {
        return hasRoute
          ? `${actorsText} commented on your ascent on '${routeName}'`
          : `${actorsText} commented on your ascent`;
      }
      if (lang === 'de') {
        if (isPlural) {
          return hasRoute
            ? `${actorsText} haben deine Begehung von '${routeName}' kommentiert`
            : `${actorsText} haben deine Begehung kommentiert`;
        }
        return hasRoute
          ? `${actorsText} hat deine Begehung von '${routeName}' kommentiert`
          : `${actorsText} hat deine Begehung kommentiert`;
      }
      // Spanish default
      if (isPlural) {
        return hasRoute
          ? `${actorsText} han comentado en tu encadene en '${routeName}'`
          : `${actorsText} han comentado en tu encadene`;
      }
      return hasRoute
        ? `${actorsText} ha comentado en tu encadene en '${routeName}'`
        : `${actorsText} ha comentado en tu encadene`;
    }

    case 'mention': {
      if (lang === 'en') {
        return hasRoute
          ? `${actorsText} mentioned you in a comment on '${routeName}'`
          : `${actorsText} mentioned you in a comment`;
      }
      if (lang === 'de') {
        if (isPlural) {
          return hasRoute
            ? `${actorsText} haben dich in Kommentaren zu '${routeName}' erwähnt`
            : `${actorsText} haben dich in einem Kommentar erwähnt`;
        }
        return hasRoute
          ? `${actorsText} hat dich in einem Kommentar zu '${routeName}' erwähnt`
          : `${actorsText} hat dich in einem Kommentar erwähnt`;
      }
      // Spanish default
      if (isPlural) {
        return hasRoute
          ? `${actorsText} te han mencionado en comentarios en '${routeName}'`
          : `${actorsText} te han mencionado en comentarios`;
      }
      return hasRoute
        ? `${actorsText} te ha mencionado en un comentario en '${routeName}'`
        : `${actorsText} te ha mencionado en un comentario`;
    }

    case 'likedComment':
    case 'liked_comment': {
      if (lang === 'en') {
        return hasRoute
          ? `${actorsText} liked your comment on '${routeName}'`
          : `${actorsText} liked your comment`;
      }
      if (lang === 'de') {
        if (isPlural) {
          return hasRoute
            ? `${actorsText} mögen deinen Kommentar zu '${routeName}'`
            : `${actorsText} mögen deinen Kommentar`;
        }
        return hasRoute
          ? `${actorsText} mag deinen Kommentar zu '${routeName}'`
          : `${actorsText} mag deinen Kommentar`;
      }
      // Spanish default
      if (isPlural) {
        return hasRoute
          ? `A ${actorsText} les ha gustado tu comentario en '${routeName}'`
          : `A ${actorsText} les ha gustado tu comentario`;
      }
      return hasRoute
        ? `A ${actorsText} le ha gustado tu comentario en '${routeName}'`
        : `A ${actorsText} le ha gustado tu comentario`;
    }

    case 'message': {
      if (text) return text;
      if (lang === 'en') return 'You received a new message';
      if (lang === 'de') return 'Du hast eine neue Nachricht erhalten';
      return 'Has recibido un nuevo mensaje';
    }

    case 'follow_request': {
      if (lang === 'en') return `${actorsText} sent you a follow request`;
      if (lang === 'de')
        return `${actorsText} hat dir eine Folgeanfrage gesendet`;
      return `${actorsText} te ha enviado una solicitud de seguimiento`;
    }

    case 'follow_accepted': {
      if (lang === 'en') return `${actorsText} accepted your follow request`;
      if (lang === 'de')
        return `${actorsText} hat deine Folgeanfrage akzeptiert`;
      return `${actorsText} ha aceptado tu solicitud de seguimiento`;
    }

    default: {
      if (lang === 'en') return 'New notification';
      if (lang === 'de') return 'Neue Benachrichtigung';
      return 'Nueva notificación';
    }
  }
}

serve(async (req) => {
  try {
    const { record } = await req.json();
    console.log('Notification received:', record);

    if (!record || !record.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id in record' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Fetch recipient subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', record.user_id);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for user:', record.user_id);
      return new Response(
        JSON.stringify({ success: true, message: 'No subscriptions' }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // 2. Fetch user profile preferences (sound/notifications enabled, language)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('notification_sound, message_sound, language')
      .eq('id', record.user_id)
      .maybeSingle();

    const lang = userProfile?.language || 'es';

    // 3. Fetch actor information and grouping info
    let actorName = '';
    const actorId = record.actor_id || record.sender_id;
    if (actorId) {
      const { data: actorProfile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('id', actorId)
        .maybeSingle();
      if (actorProfile?.name) {
        actorName = actorProfile.name;
      }
    }

    // 4. Fetch route name if resource_id is present
    let routeName = '';
    if (
      record.resource_id &&
      ['like', 'comment', 'mention', 'likedComment', 'liked_comment'].includes(
        record.type,
      )
    ) {
      const ascentId = Number(record.resource_id);
      if (!isNaN(ascentId) && ascentId > 0) {
        const { data: ascent } = await supabase
          .from('route_ascents')
          .select('routes(name)')
          .eq('id', ascentId)
          .maybeSingle();
        if (ascent?.routes) {
          routeName = (ascent.routes as { name: string }).name || '';
        }
      }
    }

    // 5. Query unread notifications for grouping
    const actorNames: string[] = [];
    if (actorName) {
      actorNames.push(actorName);
    }

    let unreadCount = 1;
    if (
      record.type &&
      record.type !== 'message' &&
      ['like', 'comment', 'mention', 'likedComment', 'liked_comment'].includes(
        record.type,
      ) &&
      record.resource_id
    ) {
      const { data: unreadRows, count } = await supabase
        .from('notifications')
        .select(
          'id, actor_id, actor:user_profiles!notifications_actor_id_fkey(name)',
          { count: 'exact' },
        )
        .eq('user_id', record.user_id)
        .eq('type', record.type)
        .eq('resource_id', record.resource_id)
        .is('read_at', null)
        .order('created_at', { ascending: false });

      if (count && count > 0) {
        unreadCount = count;
      }

      if (unreadRows && unreadRows.length > 0) {
        for (const row of unreadRows) {
          const name = (row.actor as { name: string } | null)?.name;
          if (name && !actorNames.includes(name)) {
            actorNames.push(name);
          }
        }
      }
    }

    const actorsText = formatActorsText(actorNames, lang, unreadCount);
    const body = getNotificationBody(
      record.type,
      lang,
      actorsText,
      Math.max(actorNames.length, unreadCount),
      routeName,
      record.text,
    );

    const title =
      record.type === 'message' && actorName ? actorName : 'ClimBeast';

    // 6. Group tag determination
    let tag = `cb-notif-${record.type || 'general'}`;
    if (record.type === 'message') {
      tag = `msg-${record.room_id || 'chat'}`;
    } else if (record.resource_id) {
      tag = `cb-notif-${record.type}-${record.resource_id}`;
    }

    // 7. Navigation target URL
    let targetUrl = record.url || '/home';
    if (record.type === 'message' && record.room_id) {
      targetUrl = `/chat/${record.room_id}`;
    } else if (
      record.resource_id &&
      ['like', 'comment', 'mention', 'likedComment', 'liked_comment'].includes(
        record.type,
      )
    ) {
      targetUrl = `/home?ascent=${record.resource_id}`;
    } else if (
      ['follow_request', 'follow_accepted'].includes(record.type) &&
      record.actor_id
    ) {
      targetUrl = `/profile/${record.actor_id}`;
    }

    console.log(
      `Sending push (tag: ${tag}, unread: ${unreadCount}) to ${subscriptions.length} subs: "${body}"`,
    );

    const results = await Promise.allSettled(
      subscriptions.map((sub) => {
        let shouldNotify = true;

        if (userProfile) {
          if (record.type === 'message') {
            shouldNotify = userProfile.message_sound !== false;
          } else {
            shouldNotify = userProfile.notification_sound !== false;
          }
        }

        if (!shouldNotify) return Promise.resolve();

        const payload = JSON.stringify({
          notification: {
            title,
            body,
            icon: 'https://climbeast.com/logo/android-chrome-192x192.png',
            badge: 'https://climbeast.com/logo/climbeast-small.png',
            vibrate: [200, 100, 200],
            tag,
            renotify: true,
            data: {
              url: targetUrl,
              type: record.type,
              resource_id: record.resource_id,
            },
          },
        });

        const pushOptions = {
          TTL: 86400,
          urgency: 'high',
        };

        return webpush.sendNotification(sub.subscription, payload, pushOptions);
      }),
    );

    // Cleanup invalid subscriptions
    const invalidSubs = results
      .map((res, i) =>
        res.status === 'rejected' &&
        (res.reason.statusCode === 410 || res.reason.statusCode === 404)
          ? subscriptions[i].subscription
          : null,
      )
      .filter(Boolean);

    if (invalidSubs.length > 0) {
      console.log(`Cleaning up ${invalidSubs.length} invalid subscriptions`);
      for (const sub of invalidSubs) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('subscription', sub);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error sending push:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
