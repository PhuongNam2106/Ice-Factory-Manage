-- Reject null RPC arguments before entering the domain-specific cancellation branches.
alter function public.cancel_document(text, uuid, integer, text) strict;
