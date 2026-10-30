-- q: c1-feed-file
-- status: ran
-- engine: postgis
-- after: s5-gistar, c1-feed
SELECT doc::text AS feed FROM c1_feed;
