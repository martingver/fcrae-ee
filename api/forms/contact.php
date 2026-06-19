<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$payload = json_decode($raw, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_json']);
    exit;
}

$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateDir = sys_get_temp_dir() . '/fcrae-form-rate';
if (!is_dir($rateDir)) {
    mkdir($rateDir, 0700, true);
}

$rateKey = hash('sha256', $clientIp);
$rateFile = $rateDir . '/' . $rateKey . '.json';
$now = time();
$windowSeconds = 15 * 60;
$maxRequests = 5;
$hits = [];

if (is_file($rateFile)) {
    $stored = json_decode((string) file_get_contents($rateFile), true);
    if (is_array($stored)) {
        $hits = array_values(array_filter($stored, static fn ($ts) => is_int($ts) && $ts > ($now - $windowSeconds)));
    }
}

if (count($hits) >= $maxRequests) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'rate_limited']);
    exit;
}

$hits[] = $now;
file_put_contents($rateFile, json_encode($hits), LOCK_EX);

function field(array $payload, string $key): string
{
    $value = $payload[$key] ?? '';
    return trim(is_string($value) ? $value : '');
}

function reject(string $error, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $error]);
    exit;
}

function clean_text(string $value, int $maxLength = 2000): string
{
    $value = strip_tags($value);
    $value = preg_replace('/[^\P{C}\t\r\n]+/u', '', $value) ?? $value;
    $value = preg_replace('/\s{4,}/', '   ', $value) ?? $value;
    $value = trim($value);
    return function_exists('mb_substr') ? mb_substr($value, 0, $maxLength) : substr($value, 0, $maxLength);
}

$type = field($payload, 'type');
$renderedAt = (int) ($payload['renderedAt'] ?? 0);
$message = clean_text(field($payload, 'message'));
$email = field($payload, 'email');

if (field($payload, 'website') !== '') {
    echo json_encode(['ok' => true]);
    exit;
}

if ($renderedAt <= 0 || ((int) round(microtime(true) * 1000) - $renderedAt) < 4000) {
    reject('too_fast');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reject('invalid_email');
}

if (field($payload, 'consent') === '') {
    reject('missing_consent');
}

if (preg_match_all('/https?:\/\//i', $message) > 2) {
    reject('too_many_links');
}

if (preg_match('/<\s*script|<\/?[a-z][\s\S]*>/i', field($payload, 'message'))) {
    reject('html_not_allowed');
}

$to = 'info@fcrae.ee';
$lines = [];

if ($type === 'sponsor') {
    $company = clean_text(field($payload, 'company'), 160);
    $contact = clean_text(field($payload, 'contact'), 160);
    $phone = clean_text(field($payload, 'phone'), 80);
    $package = clean_text(field($payload, 'package'), 160);

    if ($company === '' || $contact === '' || $package === '') {
        reject('missing_required');
    }

    $subject = 'FC Rae toetajapaketi päring: ' . $company;
    $lines = [
        'Tüüp: Toetajapaketi päring',
        'Ettevõte: ' . $company,
        'Kontaktisik: ' . $contact,
        'E-post: ' . $email,
        'Telefon: ' . ($phone !== '' ? $phone : '-'),
        'Huvipakkuv koostöövorm: ' . $package,
        '',
        'Sõnum:',
        $message !== '' ? $message : '-',
    ];
} elseif ($type === 'contact') {
    $name = clean_text(field($payload, 'name'), 160);
    $phone = clean_text(field($payload, 'phone'), 80);
    $topic = clean_text(field($payload, 'topic'), 160);

    if ($name === '' || $topic === '' || $message === '') {
        reject('missing_required');
    }

    $subject = 'FC Rae kontaktivorm: ' . $topic;
    $lines = [
        'Tüüp: Kontaktivorm',
        'Nimi: ' . $name,
        'E-post: ' . $email,
        'Telefon: ' . ($phone !== '' ? $phone : '-'),
        'Teema: ' . $topic,
        '',
        'Sõnum:',
        $message,
    ];
} else {
    reject('invalid_type');
}

$lines[] = '';
$lines[] = 'Nõusolek: jah';
$lines[] = 'IP: ' . $clientIp;
$lines[] = 'Saadetud: ' . date('Y-m-d H:i:s');

$headers = [
    'From: FC Rae veeb <no-reply@fcrae.ee>',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: FC Rae website'
];

$sent = mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', implode("\n", $lines), implode("\r\n", $headers));

if (!$sent) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'mail_failed']);
    exit;
}

echo json_encode(['ok' => true]);
