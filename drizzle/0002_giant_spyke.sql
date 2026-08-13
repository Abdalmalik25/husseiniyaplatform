CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`type` varchar(80) NOT NULL,
	`location` varchar(160) NOT NULL,
	`size` varchar(120),
	`note` text NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
