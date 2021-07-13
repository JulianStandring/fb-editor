class NewFlowBranchGenerator
  def to_metadata
    { uuid => default_metadata }
  end

  def uuid
    @uuid ||= SecureRandom.uuid
  end

  private

  def default_metadata
    DefaultMetadata['flow.branch']
  end
end
