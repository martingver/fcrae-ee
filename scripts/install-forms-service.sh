#!/bin/sh
# Run as root on fcraeweb after copying the three application files into /opt/fcrae-forms.
set -eu
test "$(id -u)" = 0
test -f /opt/fcrae-forms/api/forms/contact.mjs
test -f /opt/fcrae-forms/scripts/forms-server.mjs
test -f /opt/fcrae-forms/data/supporters.json
command -v node >/dev/null
command -v msmtp >/dev/null

if ! id fcrae-forms >/dev/null 2>&1; then
  useradd --system --home /var/lib/fcrae --shell /usr/sbin/nologin fcrae-forms
fi
install -d -m 0700 -o fcrae-forms -g fcrae-forms /var/lib/fcrae
install -d -m 0750 -o root -g fcrae-forms /etc/fcrae
install -d -m 0700 /var/backups/fcrae

if test -f /etc/msmtprc && ! grep -q '^# FC Rae forms relay$' /etc/msmtprc; then
  echo 'Existing msmtp configuration found. Review it before installing FC Rae settings.' >&2
  exit 1
fi
cat > /etc/msmtprc <<'CONFIG'
# FC Rae forms relay
defaults
auth off
tls on
tls_starttls on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
timeout 15
syslog LOG_MAIL

account fcrae
host smtp-relay.gmail.com
port 587
domain fcrae.ee
source_ip 89.167.60.39
from info@fcrae.ee
allow_from_override off
set_from_header on

account default : fcrae
CONFIG
chown root:fcrae-forms /etc/msmtprc
chmod 0640 /etc/msmtprc

cat > /etc/fcrae/forms.env <<'CONFIG'
HOST=127.0.0.1
PORT=4174
SENDMAIL_PATH=/usr/bin/msmtp
MAIL_FROM=info@fcrae.ee
FORMS_DATABASE=/var/lib/fcrae/requests.sqlite
TRUST_LOCAL_PROXY=1
CONFIG
chown root:fcrae-forms /etc/fcrae/forms.env
chmod 0640 /etc/fcrae/forms.env

cat > /etc/systemd/system/fcrae-forms.service <<'SERVICE'
[Unit]
Description=FC Rae website forms
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=fcrae-forms
Group=fcrae-forms
WorkingDirectory=/opt/fcrae-forms
EnvironmentFile=/etc/fcrae/forms.env
ExecStart=/usr/bin/node /opt/fcrae-forms/scripts/forms-server.mjs
Restart=on-failure
RestartSec=3
UMask=0077
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
StateDirectory=fcrae
StateDirectoryMode=0700
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6

[Install]
WantedBy=multi-user.target
SERVICE

python3 - <<'PY'
from pathlib import Path
from datetime import datetime, timezone
p = Path('/etc/nginx/sites-available/default')
content = p.read_text()
marker = '    # FC Rae form service'
if marker not in content:
    anchor = '    index index.html;'
    if content.count(anchor) != 1:
        raise SystemExit('Unexpected nginx layout; refusing an automatic edit.')
    backup = Path('/var/backups/fcrae') / ('nginx-default-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    backup.write_text(content)
    content = content.replace(anchor, anchor + '''

    # FC Rae form service
    location = /api/forms/contact {
        client_max_body_size 24k;
        proxy_pass http://127.0.0.1:4174;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location = /api/forms/contact.php {
        client_max_body_size 24k;
        proxy_pass http://127.0.0.1:4174;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /api/ { return 404; }
''', 1)
    p.write_text(content)
    print('nginx backup:', backup)
PY

/usr/sbin/nginx -t
systemctl daemon-reload
systemctl enable --now fcrae-forms.service
systemctl restart fcrae-forms.service
systemctl reload nginx
if id deploy >/dev/null 2>&1; then
  chown -R deploy:deploy /opt/fcrae-forms
  printf '%s\n' 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart fcrae-forms' > /etc/sudoers.d/fcrae-forms-deploy
  chmod 0440 /etc/sudoers.d/fcrae-forms-deploy
  /usr/sbin/visudo -cf /etc/sudoers.d/fcrae-forms-deploy
fi
echo 'FC Rae form service installed. Google Workspace must allow 89.167.60.39 in its SMTP relay.'
