execute as @a[tag=bench] at @s run tp @s ~1 150 ~ -90 15
scoreboard players add @a[tag=bench] bench 1
execute as @a[tag=bench,scores={bench=1200}] run time set midnight
execute as @a[tag=bench,scores={bench=1200}] run tellraw @s {"text":"[Benchmark] Phase 2: Nacht","color":"green"}
execute as @a[tag=bench,scores={bench=2400}] run weather rain
execute as @a[tag=bench,scores={bench=2400}] run tellraw @s {"text":"[Benchmark] Phase 3: Regen","color":"green"}
execute as @a[tag=bench,scores={bench=3600..}] run function bench:stop
