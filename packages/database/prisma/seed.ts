import { PrismaClient, Role, AssetStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create a demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme-corp',
    },
  })

  console.log(`Organization: ${org.name} (${org.id})`)

  // Create a superadmin user (you'll need to update firebaseUid after auth setup)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      firebaseUid: 'seed-superadmin-uid',
      email: 'admin@acme.com',
      displayName: 'Admin User',
      role: Role.ORG_MANAGER,
      organizationId: org.id,
    },
  })

  console.log(`User: ${admin.email} (${admin.role})`)

  // Create some demo assets
  const assets = await Promise.all([
    prisma.asset.upsert({
      where: { sku: 'LAPTOP-001' },
      update: {},
      create: {
        name: 'MacBook Pro 16"',
        sku: 'LAPTOP-001',
        description: 'M3 Pro, 36GB RAM',
        status: AssetStatus.AVAILABLE,
        organizationId: org.id,
      },
    }),
    prisma.asset.upsert({
      where: { sku: 'LAPTOP-002' },
      update: {},
      create: {
        name: 'Dell XPS 15',
        sku: 'LAPTOP-002',
        description: 'Intel i9, 32GB RAM',
        status: AssetStatus.IN_USE,
        assignedTo: admin.id,
        organizationId: org.id,
      },
    }),
    prisma.asset.upsert({
      where: { sku: 'MONITOR-001' },
      update: {},
      create: {
        name: 'LG 27" 4K Monitor',
        sku: 'MONITOR-001',
        status: AssetStatus.AVAILABLE,
        organizationId: org.id,
      },
    }),
  ])

  console.log(`Seeded ${assets.length} assets`)
  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
