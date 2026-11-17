ALTER TABLE airballons
    ADD COLUMN price DECIMAL(12, 2) NULL,
    ADD COLUMN dollor DECIMAL(12, 2) NULL;

UPDATE airballons
SET
    price = price_from,
    dollor = dollor_from;

ALTER TABLE airballons
    MODIFY COLUMN price DECIMAL(12, 2) NOT NULL;
