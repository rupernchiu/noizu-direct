import sqlite3, random, string, json
from datetime import datetime, timedelta

def cuid():
    return 'c' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=24))

def ts(dt):
    return dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')

def ago(days=0, hours=0):
    return datetime.utcnow() - timedelta(days=days, hours=hours)

conn = sqlite3.connect('dev.db')
cur = conn.cursor()

buyers   = cur.execute("SELECT id, email FROM User WHERE role='BUYER'").fetchall()
creators = cur.execute('SELECT id, userId, username FROM CreatorProfile').fetchall()
products = cur.execute("SELECT id, creatorId, title, price, type FROM Product WHERE isActive=1").fetchall()

print(f'Buyers: {len(buyers)}, Creators: {len(creators)}, Products: {len(products)}')

creator_user = {c[0]: c[1] for c in creators}

# ── ORDERS ───────────────────────────────────────────────────────────────────
order_specs = [
    (0,  0, 'COMPLETED', 'RELEASED', 45),
    (0,  2, 'COMPLETED', 'RELEASED', 38),
    (0,  4, 'COMPLETED', 'RELEASED', 30),
    (0,  7, 'SHIPPED',   'HELD',     12),
    (0, 10, 'PAID',      'HELD',      5),
    (0, 13, 'PAID',      'HELD',      2),
    (1,  1, 'COMPLETED', 'RELEASED', 60),
    (1,  5, 'COMPLETED', 'RELEASED', 20),
    (1,  8, 'SHIPPED',   'HELD',      8),
    (1, 11, 'PAID',      'HELD',      3),
]

orders_created = []
for buyer_i, prod_i, status, escrow, days in order_specs:
    if buyer_i >= len(buyers) or prod_i >= len(products):
        continue
    buyer_id = buyers[buyer_i][0]
    prod = products[prod_i % len(products)]
    prod_id, creator_id, ptitle, price, ptype = prod
    creator_uid = creator_user.get(creator_id)
    if not creator_uid:
        continue

    oid = cuid()
    tok = cuid() if ptype == 'DIGITAL' else None
    expiry = ts(ago(days=-30)) if tok else None
    tracking = 'MY' + ''.join(random.choices(string.digits, k=10)) if status == 'SHIPPED' else None
    addr = json.dumps({
        'name': 'Test Buyer', 'line1': '123 Jalan Test',
        'city': 'Kuala Lumpur', 'state': 'WP',
        'postcode': '50000', 'country': 'MY'
    }) if ptype != 'DIGITAL' else None

    created = ago(days=days)
    cur.execute(
        '''INSERT OR IGNORE INTO "Order"
           (id,buyerId,creatorId,productId,status,amountUsd,displayCurrency,displayAmount,
            exchangeRate,downloadToken,downloadExpiry,escrowStatus,trackingNumber,
            shippingAddress,createdAt,updatedAt)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (oid, buyer_id, creator_id, prod_id, status, price, 'USD', price,
         1.0, tok, expiry, escrow, tracking, addr, ts(created), ts(created))
    )
    orders_created.append((oid, buyer_id, creator_id, price, status, ts(created)))

conn.commit()
print(f'Orders inserted: {len(orders_created)}')

# ── TRANSACTIONS ──────────────────────────────────────────────────────────────
tx_count = 0
for oid, buyer_id, creator_id, price, status, created_at in orders_created:
    proc_fee = round(price * 0.025)
    creator_amt = price - proc_fee
    ref = 'AWX-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=9))
    cur.execute(
        '''INSERT OR IGNORE INTO "Transaction"
           (id,orderId,buyerId,creatorId,grossAmountUsd,processingFee,platformFee,
            withdrawalFee,creatorAmount,currency,airwallexReference,status,createdAt)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (cuid(), oid, buyer_id, creator_id, price, proc_fee, 0,
         0, creator_amt, 'USD', ref, 'COMPLETED', created_at)
    )
    tx_count += 1

conn.commit()
print(f'Transactions inserted: {tx_count}')

# ── CONVERSATIONS + MESSAGES ──────────────────────────────────────────────────
scripts = [
    [
        ('buyer',   'Hi! I love your artwork. Are you taking commissions?'),
        ('creator', 'Yes! I have 3 slots open right now. What did you have in mind?'),
        ('buyer',   'I want a full body illustration of my OC — she is a magical girl with blue hair and wind powers.'),
        ('creator', 'That sounds amazing! My full body with background starts at USD 95. Would that work for you?'),
        ('buyer',   'Perfect! How long does it take?'),
        ('creator', 'Usually 10-14 days. I will send you a sketch for approval first!'),
    ],
    [
        ('buyer',   'Hey, just ordered your sticker sheet! So excited!'),
        ('creator', 'Thank you so much! I will ship it out tomorrow.'),
        ('buyer',   'Can you let me know the tracking number when you ship?'),
        ('creator', 'Of course! I will update the order once I drop it at Pos Malaysia.'),
        ('buyer',   'Amazing, thank you!'),
        ('creator', 'My pleasure! I pack them with freebies too :)'),
    ],
    [
        ('buyer',   'Will you be at Comic Fiesta this year?'),
        ('creator', 'Yes! Table B-24. Come say hi — I have exclusive con-only prints too.'),
        ('buyer',   'Saving up for it. Love your Demon Slayer series.'),
        ('creator', 'Thank you! Working on a new arc, should be ready by CF.'),
    ],
    [
        ('buyer',   'Is the art print A3 or A4 size?'),
        ('creator', 'It is A3! Printed on 200gsm matte paper. Perfect for framing.'),
        ('buyer',   'Do you ship to Philippines?'),
        ('creator', 'Yes! Shipping to Philippines is around USD 8-12 depending on weight.'),
        ('buyer',   'Great, placing my order now!'),
        ('creator', 'Thank you! Packed and shipped within 3 business days.'),
    ],
    [
        ('buyer',   'Hi, I downloaded the wallpaper pack but one file seems corrupted.'),
        ('creator', 'Oh no, sorry! Which file is it?'),
        ('buyer',   'The 4K version of the sakura wallpaper. The others are fine.'),
        ('creator', 'Got it — I have re-uploaded it. Try the download link again.'),
        ('buyer',   'Working perfectly now! Thank you.'),
        ('creator', 'Great! Let me know if you have any other issues.'),
    ],
]

conv_count = 0
msg_count  = 0

pairs = [(buyers[b % len(buyers)], creators[c % len(creators)])
         for b in range(2) for c in range(len(creators))]

for i, (buyer_row, creator_row) in enumerate(pairs[:8]):
    buyer_id    = buyer_row[0]
    creator_uid = creator_row[1]

    exists = cur.execute(
        'SELECT id FROM Conversation WHERE buyerId=? AND creatorId=?',
        (buyer_id, creator_uid)
    ).fetchone()
    if exists:
        continue

    script    = scripts[i % len(scripts)]
    base_time = ago(days=7 - i)
    last_time = base_time + timedelta(hours=len(script) * 2)

    conv_id = cuid()
    cur.execute(
        'INSERT INTO Conversation (id,buyerId,creatorId,lastMessageAt,createdAt) VALUES (?,?,?,?,?)',
        (conv_id, buyer_id, creator_uid, ts(last_time), ts(base_time))
    )
    conv_count += 1

    for j, (role, text) in enumerate(script):
        sender   = buyer_id    if role == 'buyer'   else creator_uid
        receiver = creator_uid if role == 'buyer'   else buyer_id
        msg_time = base_time + timedelta(hours=j * 2)
        is_read  = 1 if j < len(script) - 1 else 0
        cur.execute(
            'INSERT INTO Message (id,senderId,receiverId,content,isRead,createdAt) VALUES (?,?,?,?,?,?)',
            (cuid(), sender, receiver, text, is_read, ts(msg_time))
        )
        msg_count += 1

conn.commit()
print(f'Conversations inserted: {conv_count}')
print(f'Messages inserted: {msg_count}')

# ── Final counts ──────────────────────────────────────────────────────────────
print()
print('=== FINAL COUNTS ===')
for t in ['User','CreatorProfile','Product','Order','Transaction','Message','Conversation','CartItem']:
    n = cur.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
    print(f'  {t}: {n}')

conn.close()
