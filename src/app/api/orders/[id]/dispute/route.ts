// Parallel dispute endpoint deprecated (security-batch-payments, H2).
//
// The previous POST handler let a buyer create a dispute without passing through
// `getDisputeEligibility`, without enforcing the 50-char minimum description,
// and without validating `evidence`. The canonical path is `POST /api/disputes`,
// which already enforces all three. The dispute form (DisputeFormClient) only
// ever called `/api/disputes`, so this route had no legitimate callers.
//
// We return 410 Gone instead of deleting the file outright so any stray client
// that hits the old URL gets a clear, immediate rejection rather than a 405 or
// a weakly-validated create. If verified out of rotation for a full release
// cycle, this file can be removed entirely.

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use POST /api/disputes.' },
    { status: 410 },
  )
}
